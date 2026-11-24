import { migrateProfileSelections } from '@/backend/migrate';
import type { ActivityItem, DeviceSettings, MatchingState, Profile, Settings, StoreState } from '@/backend/types';
import { listAnnouncements } from '@/data';
import { agendaKey } from '@/lib/agenda-item';
import { storedEvent, toOverrides } from '@/lib/event-setup';
import { priorState } from '@/matching/ranker';
import { PRIOR_WEIGHTS } from '@/matching/weights';

export const DEFAULT_SETTINGS: Settings = {
  cacheEnabled: true,
  notifications: true,
  use24h: false,
  appearance: 'system',
  // Started when the app first loads, so a fresh install already "is" Day 2 mid-morning.
  demoClock: { anchor: '2026-05-28T10:05', startedAt: new Date().toISOString() },
};

export function makeDefaultMatching(): MatchingState {
  return {
    ranker: priorState(),
    taste: undefined,
    embedderId: 'lexical',
    impressions: {},
    bookmarkedPeople: [],
    hiddenPeople: [],
    feedback: [],
  };
}

export function defaultActivity(): ActivityItem[] {
  return listAnnouncements().map((a) => ({
    id: a.id,
    kind: 'announcement',
    title: a.title,
    body: a.body,
    date: a.date,
  }));
}

const GUEST_PROFILE: Profile = {
  id: 'guest',
  firstName: '',
  lastName: '',
  title: '',
  company: '',
  role: 'Startup',
  industry: '',
  intro: '',
  selections: [],
  networking: false,
  countries: [],
  availability: [],
  blocked: [],
  social: {},
};

/** Stable empty state used while no account is signed in. */
export function makeGuestState(): StoreState {
  return {
    profile: GUEST_PROFILE,
    meetings: [],
    activity: [],
    bookmarks: { bookmarked: [], visited: [], mySessions: [] },
    settings: DEFAULT_SETTINGS,
    readAnnouncements: [],
    leads: [],
    chats: {},
    matching: makeDefaultMatching(),
    reelLikes: [],
    reelSaves: [],
    reservations: [],
    tickets: [],
    mySideEvents: [],
    reminders: [],
    dismissedReminders: [],
    follows: { speakers: [] },
    stamps: [],
  };
}

function migrateMatching(stored: unknown, defaults: MatchingState): MatchingState {
  if (!stored || typeof stored !== 'object') return defaults;
  const s = stored as Partial<MatchingState>;
  const weights = s.ranker?.weights;
  const ranker =
    Array.isArray(weights) && weights.length === PRIOR_WEIGHTS.length
      ? { weights, updates: typeof s.ranker?.updates === 'number' ? s.ranker.updates : 0 }
      : defaults.ranker;
  return {
    ranker,
    taste: Array.isArray(s.taste) ? s.taste : defaults.taste,
    embedderId: typeof s.embedderId === 'string' ? s.embedderId : defaults.embedderId,
    impressions:
      s.impressions && typeof s.impressions === 'object' ? s.impressions : defaults.impressions,
    bookmarkedPeople: Array.isArray(s.bookmarkedPeople)
      ? s.bookmarkedPeople
      : defaults.bookmarkedPeople,
    hiddenPeople: Array.isArray(s.hiddenPeople) ? s.hiddenPeople : defaults.hiddenPeople,
    feedback: Array.isArray(s.feedback) ? s.feedback.slice(-200) : defaults.feedback,
  };
}

/** The availability grid stores whole hours only, so "T10:30" becomes "T10:00" (de-duplicated). */
export function toWholeHours(availability: unknown[]): string[] {
  const entries = availability.filter((entry): entry is string => typeof entry === 'string');
  return [...new Set(entries.map((entry) => `${entry.slice(0, 13)}:00`))];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** null (real time) or a clock whose dates parse; anything else falls back to the default clock. */
function isDemoClock(value: unknown): value is Settings['demoClock'] {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const clock = value;
  return (
    typeof clock.anchor === 'string' &&
    typeof clock.startedAt === 'string' &&
    // An unparsable date would make the event clock an Invalid Date and break every time label.
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clock.anchor) &&
    Number.isFinite(Date.parse(`${clock.anchor}:00Z`)) &&
    Number.isFinite(Date.parse(clock.startedAt))
  );
}

/** The device's switches and event setup; anything missing or malformed loads as the default (every feature on, Eventor). */
export function normalizeDevice(raw: unknown): DeviceSettings {
  const device = isRecord(raw) ? raw : {};
  return { features: isRecord(device.features) ? toOverrides(device.features) : {}, event: storedEvent(device.event) };
}

/**
 * Fills any missing fields with defaults so stored and seed states are always complete.
 * Used on load (seed and stored alike) and for the one-time import of the old store key.
 */
export function normalizeState(raw: unknown): StoreState {
  const base = makeGuestState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<StoreState>;
  const profile = (s.profile ?? {}) as Partial<Profile> & { interests?: unknown };
  // Known settings only: earlier v0.4 builds also kept the switches and the event here (normalizeDb moves them to db.device).
  const settings = Object.fromEntries(Object.entries(s.settings ?? {}).filter(([key]) => Object.hasOwn(DEFAULT_SETTINGS, key)));
  return {
    profile: {
      ...base.profile,
      ...profile,
      selections: migrateProfileSelections(profile),
      networking: profile.networking ?? true,
      social: { ...base.profile.social, ...(profile.social ?? {}) },
      blocked: Array.isArray(profile.blocked) ? profile.blocked : [],
      countries: Array.isArray(profile.countries) ? profile.countries : [],
      availability: Array.isArray(profile.availability) ? toWholeHours(profile.availability) : [],
    },
    meetings: Array.isArray(s.meetings)
      ? s.meetings.filter((m) => isRecord(m)).map((m) => ({
          ...m,
          createdAt: m.createdAt ?? m.start ?? new Date().toISOString(),
        }))
      : [],
    activity: Array.isArray(s.activity) ? s.activity : defaultActivity(),
    bookmarks: {
      ...base.bookmarks,
      ...(s.bookmarks ?? {}),
      bookmarked: Array.isArray(s.bookmarks?.bookmarked) ? s.bookmarks.bookmarked : [],
      visited: Array.isArray(s.bookmarks?.visited) ? s.bookmarks.visited : [],
      mySessions: Array.isArray(s.bookmarks?.mySessions) ? s.bookmarks.mySessions : [],
    },
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      demoClock:
        s.settings && isDemoClock(s.settings.demoClock)
          ? s.settings.demoClock
          : DEFAULT_SETTINGS.demoClock,
    },
    readAnnouncements: Array.isArray(s.readAnnouncements) ? s.readAnnouncements : [],
    leads: Array.isArray(s.leads) ? s.leads : [],
    chats: s.chats && typeof s.chats === 'object' ? s.chats : {},
    matching: migrateMatching(s.matching, base.matching),
    reelLikes: Array.isArray(s.reelLikes) ? s.reelLikes : [],
    reelSaves: Array.isArray(s.reelSaves) ? s.reelSaves : [],
    reservations: Array.isArray(s.reservations) ? s.reservations : [],
    tickets: Array.isArray(s.tickets) ? s.tickets : [],
    mySideEvents: Array.isArray(s.mySideEvents) ? s.mySideEvents : [],
    // Reminders are on by default: state saved before they existed gets one per agenda item.
    reminders: Array.isArray(s.reminders)
      ? s.reminders
      : [
          ...(Array.isArray(s.bookmarks?.mySessions) ? s.bookmarks.mySessions : []).map((id) =>
            agendaKey('session', id),
          ),
          ...(Array.isArray(s.meetings) ? s.meetings : []).filter((m) => isRecord(m)).map((m) => agendaKey('meeting', m.id)),
        ],
    dismissedReminders: Array.isArray(s.dismissedReminders) ? s.dismissedReminders : [],
    follows: { speakers: Array.isArray(s.follows?.speakers) ? s.follows.speakers : [] },
    stamps: Array.isArray(s.stamps) ? s.stamps : [],
  };
}
