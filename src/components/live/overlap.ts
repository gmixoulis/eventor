import { overlaps } from '@/components/schedule/agenda-math';
import type { AgendaItem } from '@/lib/agenda-item';
import { formatTime } from '@/lib/format';

const block = (item: AgendaItem) => ({ dayId: item.day, startTime: item.startTime, endTime: item.endTime });

/** Warning for an item that clashes with another agenda item, or null. */
export function agendaOverlapLabel(item: AgendaItem, agenda: AgendaItem[], use24h: boolean): string | null {
  const other = agenda.find((x) => x.key !== item.key && overlaps(block(item), block(x)));
  if (!other) return null;
  return other.kind === 'meeting'
    ? `Overlaps with your ${formatTime(other.startTime, use24h)} meeting`
    : `Overlaps with ${other.title}`;
}
