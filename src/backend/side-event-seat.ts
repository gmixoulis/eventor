import { getDb } from '@/backend/db';
import { agendaKey } from '@/lib/agenda-item';

/** Reservations and approved requests share one seat even when the request switch changes. */
export function assertNoSideEventSeat(
  accountId: string | null,
  sideEventId: string,
  existing: 'reservation' | 'application',
): void {
  if (accountId === null) return;
  const db = getDb();
  const key = agendaKey('side-event', sideEventId);
  const occupied = existing === 'reservation'
    ? db.states[accountId]?.reservations.some((r) => r.key === key)
    : db.shared.applications.some((a) =>
        a.accountId === accountId && a.sideEventId === sideEventId && a.status === 'approved');
  if (occupied) throw new Error('Already has a seat');
}
