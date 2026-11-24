import { byStart, itemEndMs, itemStartMs, type AgendaItem } from '@/lib/agenda-item';

export type UpNext = {
  current: AgendaItem | null;
  next: AgendaItem | null;
  later: AgendaItem[];
};

function byEnd(a: AgendaItem, b: AgendaItem): number {
  return itemEndMs(a) - itemEndMs(b) || a.title.localeCompare(b.title);
}

/** current = in progress (soonest to finish), next = first not started, later = the two after it. */
export function upNext(items: AgendaItem[], now: Date): UpNext {
  const nowMs = now.getTime();
  const inProgress = items
    .filter((item) => itemStartMs(item) <= nowMs && nowMs < itemEndMs(item))
    .sort(byEnd);
  const notStarted = items.filter((item) => itemStartMs(item) > nowMs).sort(byStart);

  return {
    current: inProgress[0] ?? null,
    next: notStarted[0] ?? null,
    later: notStarted.slice(1, 3),
  };
}
