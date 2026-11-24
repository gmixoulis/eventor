import { byStart, itemEndMs, type AgendaItem } from '@/lib/agenda-item';

export type ScheduleRow = { kind: 'item'; item: AgendaItem } | { kind: 'now' };
export type DaySection = { title: string; data: ScheduleRow[] };

/**
 * Items grouped by day and sorted by start. On `today` a "now" row sits between the
 * items that have ended and the rest (at the end once everything has ended).
 */
export function daySections(items: AgendaItem[], nowMs: number, today: string): DaySection[] {
  const sections: DaySection[] = [];
  for (const item of [...items].sort(byStart)) {
    const last = sections[sections.length - 1];
    const row: ScheduleRow = { kind: 'item', item };
    if (last?.title === item.day) last.data.push(row);
    else sections.push({ title: item.day, data: [row] });
  }
  const section = sections.find((s) => s.title === today);
  if (section) {
    const upcoming = section.data.findIndex((r) => r.kind === 'item' && itemEndMs(r.item) > nowMs);
    section.data.splice(upcoming < 0 ? section.data.length : upcoming, 0, { kind: 'now' });
  }
  return sections;
}

/** Where the "now" row is, for scrolling to it. */
export function nowLocation(sections: DaySection[]): { sectionIndex: number; itemIndex: number } | null {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const itemIndex = sections[sectionIndex].data.findIndex((r) => r.kind === 'now');
    if (itemIndex >= 0) return { sectionIndex, itemIndex };
  }
  return null;
}
