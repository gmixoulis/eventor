import type { Person, Selection } from '@/data/types';
import type { AccentId } from '@/lib/event-setup';
import type { FeatureId } from '@/lib/features';
import type { RankerState } from '@/matching/ranker';
import type { MatchSignal } from '@/matching/weights';

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  role: string;
  industry: string;
  intro: string;
  selections: Selection[];
  networking: boolean;
  countries: string[];
  availability: string[];
  blocked: string[];
  social: {
    website?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
};

export type Meeting = {
  id: string;
  createdAt: string;
  personId: string;
  name: string;
  company: string;
  title: string;
  role: Person['role'];
  start: string;
  duration: number;
  place: string;
  slotId?: string;
  table?: number;
  note?: string;
  suggestedBy?: 'organizer';
  status: 'pending' | 'accepted' | 'declined';
  direction: 'inbound' | 'outbound';
};

export type ActivityItem = {
  id: string;
  kind: 'announcement' | 'meeting' | 'stamp' | 'reservation' | 'promotion';
  title: string;
  body: string;
  /** Meeting items: start ("2026-05-28T13:00") and place, formatted at render time. */
  meetingStart?: string;
  place?: string;
  date: string;
};

export type Settings = {
  cacheEnabled: boolean;
  notifications: boolean;
  use24h: boolean;
  /** Light or dark theme; 'system' follows the device. */
  appearance: 'system' | 'light' | 'dark';
  /** Demo clock: anchor event wall time plus the real instant the clock started, or null for real time. */
  demoClock: { anchor: string; startedAt: string } | null;
};

/** The organizer's choices, saved once for the device: every account and visitors see the same ones. */
export type DeviceSettings = {
  /** Organizer feature switches: only the ones that differ from the default are saved. */
  features: Partial<Record<FeatureId, boolean>>;
  /** The event setup form's name and action colour; null shows Eventor with its own blue. */
  event: { name: string; accent: AccentId } | null;
};

export type Lead = {
  id: string;
  name: string;
  title: string;
  company: string;
  scannedAt: string;
};

export type ChatMessage = {
  id: string;
  text: string;
  sentAt: string;
  mine: boolean;
};

export type MatchFeedback = {
  personId: string;
  signal: MatchSignal;
  at: string;
};

export type MatchingState = {
  ranker: RankerState;
  taste?: number[];
  embedderId: string;
  impressions: Record<string, number>;
  bookmarkedPeople: string[];
  hiddenPeople: string[];
  feedback: MatchFeedback[];
};

export type Reservation = {
  key: string;
  status: 'reserved' | 'waitlist';
  createdAt: string;
};

/** A bought ticket. Only the card brand and last four digits are kept, never the full number or CVC. */
export type Ticket = {
  id: string;
  typeId: string;
  holderName: string;
  email: string;
  priceCents: number;
  cardBrand: string;
  cardLast4: string;
  purchasedAt: string;
  code: string;
};

export type Stamp = {
  targetId: string;
  at: string;
};

/** Per-account state: everything a signed-in attendee owns. */
export type StoreState = {
  profile: Profile;
  meetings: Meeting[];
  activity: ActivityItem[];
  bookmarks: {
    bookmarked: string[];
    visited: string[];
    mySessions: string[];
  };
  settings: Settings;
  readAnnouncements: string[];
  leads: Lead[];
  chats: Record<string, ChatMessage[]>;
  matching: MatchingState;
  reelLikes: string[];
  reelSaves: string[];
  reservations: Reservation[];
  tickets: Ticket[];
  mySideEvents: string[];
  reminders: string[];
  dismissedReminders: string[];
  follows: { speakers: string[] };
  stamps: Stamp[];
};

/** A demo sign-in identity. No passwords anywhere. */
export type Account = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: Person['role'];
  title: string;
  company: string;
  tagline: string;
  /** Made-up demo address on example.com. */
  email: string;
  /** The app admin assigns side-event sub-admins and opens every organizer tool. */
  permission?: 'admin';
};

/** A request for a place at a side event; visitors have no account and file by email. */
export type Application = {
  id: string;
  sideEventId: string;
  accountId: string | null;
  name: string;
  email: string;
  note: string;
  /** Visitors only: the interest ids they picked, so their fit can be scored. */
  selections?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

export type Db = {
  version: 1;
  /** `visitorEmail`: the email a visitor last requested a place with, so their status shows again. */
  session: { accountId: string | null; visitorEmail?: string };
  accounts: Record<string, Account>;
  states: Record<string, StoreState>;
  device: DeviceSettings;
  shared: {
    reelLikes: Record<string, number>;
    reserved: Record<string, number>;
    applications: Application[];
    /** Side event id to the account id of its sub-admin. */
    sideEventAdmins: Record<string, string>;
  };
};
