import type { TimeSection } from '@/components/schedule/agenda-math';
import type { SideEvent } from '@/data';
import type { Session } from '@/data/types';
import { toMinutes } from '@/lib/format';

export type MergedRow = { kind: 'session'; session: Session } | { kind: 'side-event'; event: SideEvent };

export type MergedSection = { startTime: string; endMinutes: number; rows: MergedRow[] };

const rowEnd = (row: MergedRow) => toMinutes(row.kind === 'session' ? row.session.endTime : row.event.endTime);

/** Adds side events to the agenda's time sections (new sections where no session starts), sorted by start. */
export function mergeSideEvents(sections: TimeSection[], sideEvents: SideEvent[]): MergedSection[] {
  const byTime = new Map<string, MergedRow[]>();
  for (const s of sections) byTime.set(s.startTime, s.sessions.map((session) => ({ kind: 'session', session })));
  const events = [...sideEvents].sort((a, b) => a.title.localeCompare(b.title));
  for (const event of events) {
    const row: MergedRow = { kind: 'side-event', event };
    const existing = byTime.get(event.startTime);
    if (existing) existing.push(row);
    else byTime.set(event.startTime, [row]);
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startTime, rows]) => ({ startTime, rows, endMinutes: Math.max(...rows.map(rowEnd)) }));
}

/** Index of the first section that has not ended; `sections.length` once all ended. */
export function currentMergedIndex(sections: MergedSection[], nowMinutes: number): number {
  const i = sections.findIndex((s) => s.endMinutes > nowMinutes);
  return i < 0 ? sections.length : i;
}
