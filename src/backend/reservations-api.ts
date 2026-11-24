import { getDb, load, scheduleWrite } from '@/backend/db';
import { delay } from '@/backend/latency';
import { assertNoSideEventSeat } from '@/backend/side-event-seat';
import type { Reservation } from '@/backend/types';
import { getSession, getSideEvent } from '@/data';
import { sessionToItem, sideEventToItem, type AgendaItem } from '@/lib/agenda-item';
import { walkInSeats } from '@/lib/live-status';
import {
  cancel as cancelReservation,
  reserve as reserveSeat,
  waitlistPositions,
  type ReservationSet,
} from '@/lib/reservations';

let lastStampMs = 0;

/** A strictly increasing timestamp, so two reservations never tie on the waitlist. */
function serverNow(): string {
  lastStampMs = Math.max(Date.now(), lastStampMs + 1);
  return new Date(lastStampMs).toISOString();
}

/** A self-contained view of reservations across the database, for the pure decision logic. */
function reservationSet(): ReservationSet {
  const db = getDb();
  const byAccount: ReservationSet['byAccount'] = {};
  for (const [id, state] of Object.entries(db.states)) byAccount[id] = state.reservations;
  return { byAccount, reserved: db.shared.reserved };
}

function writeReservationSet(set: ReservationSet): void {
  const db = getDb();
  for (const [id, reservations] of Object.entries(set.byAccount)) {
    if (db.states[id]) db.states[id].reservations = reservations;
  }
  db.shared.reserved = set.reserved;
  scheduleWrite();
}

/** The agenda item behind a reservation key, or undefined for an unknown key. */
function reservationItem(key: string): AgendaItem | undefined {
  const sep = key.indexOf(':');
  const kind = key.slice(0, sep);
  const id = key.slice(sep + 1);
  const session = kind === 'session' ? getSession(id) : undefined;
  if (session) return sessionToItem(session);
  const sideEvent = kind === 'side-event' ? getSideEvent(id) : undefined;
  return sideEvent ? sideEventToItem(sideEvent) : undefined;
}

/** The human title behind a reservation key, so promotion notices can name the item. */
function reservationTitle(key: string): string {
  return reservationItem(key)?.title ?? key;
}

/** Simulated walk-ins at the event clock's `now`, the same figure the live status counts. */
export function walkInsAt(key: string, now: Date): number {
  const item = reservationItem(key);
  return item ? walkInSeats(item, now) : 0;
}

/**
 * Cancel one reservation at the event clock's `now`. A freed seat goes to the earliest
 * waitlisted account unless walk-ins still fill the item; that account finds a notice in its
 * activity the next time its state loads. Returns the promoted account id.
 */
export function cancelAndPromote(accountId: string, key: string, now: Date): string | null {
  const capacity = reservationItem(key)?.capacity ?? Infinity;
  const result = cancelReservation(reservationSet(), accountId, key, capacity, walkInsAt(key, now));
  writeReservationSet(result.set);
  const promoted =
    result.promotedAccountId === null ? null : getDb().states[result.promotedAccountId];
  if (promoted) {
    promoted.activity = [
      {
        id: `act-promoted-${key}-${Date.now()}`,
        kind: 'promotion',
        title: `A seat opened: you are in for ${reservationTitle(key)}`,
        body: '',
        date: new Date().toISOString(),
      },
      ...promoted.activity,
    ];
  }
  return result.promotedAccountId;
}

export const reservationsApi = {
  /**
   * POST /reservations: a free seat is reserved (the shared count goes up), otherwise the
   * account joins the waitlist. Idempotent for the same account and key. `createdAt` is the
   * server's timestamp, which orders the waitlist. `now` is the event clock: simulated
   * walk-ins at that moment count as taken, so the API enforces the seats the UI shows.
   */
  async reserve(
    accountId: string,
    key: string,
    capacity: number,
    now: Date,
  ): Promise<{
    status: Reservation['status'];
    position: number | null;
    createdAt: string;
  }> {
    await load();
    await delay();
    if (!getDb().states[accountId]) throw new Error(`Unknown account ${accountId}`);
    if (key.startsWith('side-event:')) {
      assertNoSideEventSeat(accountId, key.slice('side-event:'.length), 'application');
    }
    const stamp = serverNow();
    const result = reserveSeat(reservationSet(), accountId, key, capacity, stamp, walkInsAt(key, now));
    writeReservationSet(result.set);
    const stored = result.set.byAccount[accountId]?.find((r) => r.key === key);
    return {
      status: result.status,
      position: result.position,
      createdAt: stored?.createdAt ?? stamp,
    };
  },
  /** DELETE /reservations/:key (`now` is the event clock, as for reserve) */
  async cancel(
    accountId: string,
    key: string,
    now: Date,
  ): Promise<{ promotedAccountId: string | null }> {
    await load();
    await delay();
    return { promotedAccountId: cancelAndPromote(accountId, key, now) };
  },
  /** GET /reservations/counts (reserved seats per agenda key, shared by every account) */
  async counts(): Promise<Record<string, number>> {
    await load();
    await delay();
    return { ...getDb().shared.reserved };
  },
  /** GET /reservations/positions (this account's waitlist positions, ordered across all accounts) */
  async positions(accountId: string): Promise<Record<string, number>> {
    await load();
    await delay();
    return waitlistPositions(reservationSet().byAccount, accountId);
  },
};
