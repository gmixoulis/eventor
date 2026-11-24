import { eventTomorrow, itemStartMs, withoutAllDay, type AgendaItem } from '@/lib/agenda-item';
import { eventWallClock } from '@/lib/event-clock';
import { mergeFeatures, type FeatureFlags, type FeatureId } from '@/lib/features';
import { formatDuration, formatShortDay, formatTime } from '@/lib/format';
import { homeSections, type HomeSection } from '@/lib/home-layout';
import { upNext } from '@/lib/up-next';

// Moved to src/lib so the assistant server does not import a UI folder; Home keeps importing them from here.
export { eventTomorrow, isAllDayItem, withoutAllDay } from '@/lib/agenda-item';

export function timeUntil(item: AgendaItem, now: Date, use24h: boolean): string {
  const minutes = Math.ceil((itemStartMs(item) - now.getTime()) / 60000);
  if (minutes <= 0) return 'now';
  const today = eventWallClock(now).day;
  const tomorrow = eventTomorrow(now);
  const time = formatTime(item.startTime, use24h);
  if (item.day === today) return `in ${formatDuration(minutes)}`;
  if (item.day === tomorrow) return `tomorrow at ${time}`;
  return `${formatShortDay(item.day)} at ${time}`;
}

/** The feature each Home section belongs to; banners and the word of the day are always shown. */
const SECTION_FEATURE: Partial<Record<HomeSection, FeatureId>> = {
  ticket: 'tickets',
  'up-next': 'schedule', 'near-now': 'schedule', recommended: 'schedule', matches: 'people', pitches: 'reels',
  'side-events': 'sideEvents', passport: 'passport', speakers: 'speakers',
};

export function visibleSections(role: string, isGuest: boolean, networking: boolean, flags: FeatureFlags = mergeFeatures()): HomeSection[] {
  return homeSections(isGuest ? '' : role).filter((section) => {
    const feature = SECTION_FEATURE[section];
    if (feature && !flags[feature]) return false;
    if (['ticket', 'up-next', 'recommended', 'passport'].includes(section)) return !isGuest;
    if (section === 'matches') return !isGuest && networking;
    return true;
  });
}

/** What Home's Up Next section shows, derived from the agenda at one instant. */
export type UpNextPlan = {
  /** The saved item in progress, or null. */
  now: AgendaItem | null;
  /** The first item not yet started; the lead block when nothing is on. */
  next: AgendaItem | null;
  /** The short timeline after the lead block, at most three items. */
  following: AgendaItem[];
};

/**
 * Decides Home's "Now" and "Next for you" blocks: the item in progress, the lead
 * "next" item, and up to three items after it. All-day placeholder blocks are skipped.
 */
export function planUpNext(items: AgendaItem[], now: Date): UpNextPlan {
  const { current, next, later } = upNext(withoutAllDay(items), now);
  return {
    now: current,
    next,
    following: (current && next ? [next, ...later] : later).slice(0, 3),
  };
}
