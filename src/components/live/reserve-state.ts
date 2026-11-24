import type { Reservation } from '@/backend/types';
import type { LiveStatus } from '@/lib/live-status';

export type ReserveState =
  | { kind: 'hidden' }
  | { kind: 'reserve' }
  | { kind: 'join-waitlist' }
  | { kind: 'reserved' }
  | { kind: 'waitlist'; position: number | null };

/** What the reserve control shows: a held seat or place wins, then ended hides it, then full means waitlist. */
export function reserveState(
  status: LiveStatus,
  held: Reservation['status'] | null,
  position: number | null,
): ReserveState {
  if (status.capacity === null || status.phase === 'ended') return { kind: 'hidden' };
  if (held === 'reserved') return { kind: 'reserved' };
  if (held === 'waitlist') return { kind: 'waitlist', position };
  return status.level === 'full' ? { kind: 'join-waitlist' } : { kind: 'reserve' };
}

/** The small card tag for a held seat: "Reserved", "Waitlist 3", or null. */
export function reservationTag(held: Reservation['status'] | null, position: number | null): string | null {
  if (held === 'reserved') return 'Reserved';
  if (held === 'waitlist') return position === null ? 'Waitlist' : `Waitlist ${position}`;
  return null;
}

/**
 * Which detail-screen actions show. An ended item offers no reserve control and no bell. An
 * item with a capacity shows the reserve control, plus the agenda toggle while it is saved but
 * no seat or waitlist place is held (for example after a cancel), so it can be removed here.
 */
export function liveActions(
  status: LiveStatus,
  held: Reservation['status'] | null,
  inAgenda: boolean,
): { reserve: boolean; agendaToggle: boolean; bell: boolean } {
  const ended = status.phase === 'ended';
  if (status.capacity === null) return { reserve: false, agendaToggle: true, bell: !ended };
  return { reserve: !ended, agendaToggle: inAgenda && held === null, bell: !ended };
}
