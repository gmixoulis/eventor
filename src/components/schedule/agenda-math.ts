import type { Session } from '@/data/types';
import { formatDuration as formatMinutes, toMinutes } from '@/lib/format';

export type TimeSection = {
  startTime: string;
  sessions: Session[];
};

const ALL_DAY_MINUTES = 6 * 60;

/** A session is all-day when flagged or when it spans more than six hours. */
export function isAllDay(session: Session): boolean {
  return (
    session.allDay === true ||
    toMinutes(session.endTime) - toMinutes(session.startTime) > ALL_DAY_MINUTES
  );
}

/** Groups sessions by start time, sorted; sessions over six hours land in `allDay`. */
export function groupByTime(sessions: Session[]): {
  allDay: Session[];
  sections: TimeSection[];
} {
  const allDay: Session[] = [];
  const byTime = new Map<string, Session[]>();
  for (const s of sessions) {
    if (isAllDay(s)) {
      allDay.push(s);
      continue;
    }
    const existing = byTime.get(s.startTime);
    if (existing) existing.push(s);
    else byTime.set(s.startTime, [s]);
  }
  const sections = [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startTime, list]) => ({
      startTime,
      sessions: [...list].sort((a, b) => a.title.localeCompare(b.title)),
    }));
  allDay.sort((a, b) => a.title.localeCompare(b.title));
  return { allDay, sections };
}

type TimedBlock = { dayId: string; startTime: string; endTime: string };

/**
 * Two same-day blocks overlap when their windows intersect. Touching end-to-start
 * does not overlap, and blocks on different days never overlap.
 */
export function overlaps(a: TimedBlock, b: TimedBlock): boolean {
  if (a.dayId !== b.dayId) return false;
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/** "45 min", "1 h 30 min". */
export function sessionLength(start: string, end: string): string {
  return formatMinutes(toMinutes(end) - toMinutes(start));
}
