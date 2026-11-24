import { api } from '@/backend/api';
import type { Reservation, StoreState } from '@/backend/types';
import { requireSignIn } from '@/components/auth/require-sign-in';
import { withAgendaEntry, type AgendaItem } from '@/lib/agenda-item';
import { useStoreValue } from '@/store/context';
import { nextId } from '@/store/ids';

/** Saves a reserved item to the agenda (reminder on) and records the reservation and activity. */
function withReservation(
  s: StoreState,
  item: AgendaItem,
  reservation: Reservation,
  position: number | null,
): StoreState {
  if (s.reservations.some((r) => r.key === item.key)) return s;
  const saved = withAgendaEntry(s, item);
  const title =
    reservation.status === 'reserved'
      ? `You reserved a seat at ${item.title}`
      : `You joined the waitlist for ${item.title}, position ${position ?? 1}`;
  return {
    ...saved,
    reservations: [...s.reservations, reservation],
    activity: [
      { id: nextId('act'), kind: 'reservation', title, body: '', date: reservation.createdAt },
      ...s.activity,
    ],
  };
}

/** A released seat or waitlist place: the reservation and the item's reminder go, the agenda entry stays. */
export function withoutReservation(s: StoreState, key: string): StoreState {
  return {
    ...s,
    reservations: s.reservations.filter((r) => r.key !== key),
    reminders: s.reminders.filter((k) => k !== key),
  };
}

export function useReservations(): {
  counts: Record<string, number>;
  statusOf: (key: string) => Reservation['status'] | null;
  positionOf: (key: string) => number | null;
  reserve: (item: AgendaItem, now: Date) => Promise<boolean | 'switched'>;
  cancel: (key: string, now: Date) => Promise<void>;
} {
  const { state, setState, accountIdRef, reservedCounts, waitlistPositions, refreshReservations } =
    useStoreValue();

  const statusOf = (key: string): Reservation['status'] | null =>
    state.reservations.find((r) => r.key === key)?.status ?? null;

  const positionOf = (key: string): number | null =>
    statusOf(key) === 'waitlist' ? (waitlistPositions[key] ?? null) : null;

  /**
   * `now` is the event clock, so the API counts the same walk-ins the status shows. False for a
   * guest (sign-in prompt), an item without capacity or a failed call; 'switched' when the
   * account changed mid-call (not a failure, nothing to show).
   */
  const reserve = async (item: AgendaItem, now: Date): Promise<boolean | 'switched'> => {
    const id = accountIdRef.current;
    if (id === null) {
      requireSignIn();
      return false;
    }
    if (item.capacity === undefined) return false;
    try {
      const result = await api.reservations.reserve(id, item.key, item.capacity, now);
      if (accountIdRef.current !== id) return 'switched';
      const reservation: Reservation = {
        key: item.key,
        status: result.status,
        createdAt: result.createdAt,
      };
      setState((s) => withReservation(s, item, reservation, result.position));
      await refreshReservations();
      return true;
    } catch {
      return false;
    }
  };

  /** Releases the seat or waitlist place and turns the item's reminder off; it stays in the agenda. */
  const cancel = async (key: string, now: Date): Promise<void> => {
    const id = accountIdRef.current;
    if (id === null) {
      requireSignIn();
      return;
    }
    try {
      await api.reservations.cancel(id, key, now);
    } catch {
      return;
    }
    if (accountIdRef.current !== id) return;
    setState((s) => withoutReservation(s, key));
    await refreshReservations();
  };

  return {
    counts: reservedCounts,
    statusOf,
    positionOf,
    reserve,
    cancel,
  };
}
