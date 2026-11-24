import type { AgendaItem } from '@/lib/agenda-item';
import { liveStatus, type LiveStatus } from '@/lib/live-status';
import { useEventClock, useReservations } from '@/store';

/** Live status of one item at the event clock's "now", counting the shared reservations. */
export function useLiveStatus(): (item: AgendaItem) => LiveStatus {
  const { now } = useEventClock();
  const { counts } = useReservations();
  return (item) => liveStatus(item, now, counts[item.key] ?? 0);
}
