/** Pure reservation decisions, so the API layer and tests share one source of truth. */
import type { Reservation } from '@/backend/types';
import { takenSeats } from '@/lib/live-status';

/** A self-contained view of every account's reservations and the shared reserved counters. */
export type ReservationSet = {
  byAccount: Record<string, Reservation[]>;
  reserved: Record<string, number>;
};

function byCreatedAt(a: Reservation, b: Reservation): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function flatten(set: ReservationSet): Reservation[] {
  return Object.values(set.byAccount).flat();
}

function findAccount(set: ReservationSet, reservation: Reservation): string | null {
  for (const [accountId, list] of Object.entries(set.byAccount)) {
    if (list.includes(reservation)) return accountId;
  }
  return null;
}

/** 1-based waitlist position of `createdAt` for `key` across all accounts, or null when absent. */
export function waitlistPosition(
  key: string,
  createdAt: string,
  all: Reservation[],
): number | null {
  const waitlist = all
    .filter((r) => r.key === key && r.status === 'waitlist')
    .sort(byCreatedAt);
  const index = waitlist.findIndex((r) => r.createdAt === createdAt);
  return index < 0 ? null : index + 1;
}

/** The account's waitlist positions by key, counted across every account by createdAt. */
export function waitlistPositions(
  byAccount: Record<string, Reservation[]>,
  accountId: string,
): Record<string, number> {
  const all = Object.values(byAccount).flat();
  const out: Record<string, number> = {};
  for (const mine of byAccount[accountId] ?? []) {
    if (mine.status !== 'waitlist') continue;
    const position = waitlistPosition(mine.key, mine.createdAt, all);
    if (position !== null) out[mine.key] = position;
  }
  return out;
}

/**
 * Reserve a seat or join the waitlist. Idempotent: reserving the same key twice for the
 * same account returns the existing reservation and leaves the set unchanged. Simulated
 * `walkIns` count as taken seats, the same rule the live status shows.
 */
export function reserve(
  set: ReservationSet,
  accountId: string,
  key: string,
  capacity: number,
  createdAt: string,
  walkIns = 0,
): { set: ReservationSet; status: Reservation['status']; position: number | null } {
  const account = set.byAccount[accountId] ?? [];
  const existing = account.find((r) => r.key === key);
  if (existing) {
    return {
      set,
      status: existing.status,
      position:
        existing.status === 'waitlist'
          ? waitlistPosition(key, existing.createdAt, flatten(set))
          : null,
    };
  }

  const count = set.reserved[key] ?? 0;
  if (takenSeats(capacity, count, walkIns) < capacity) {
    return {
      set: {
        ...set,
        byAccount: {
          ...set.byAccount,
          [accountId]: [...account, { key, status: 'reserved' as const, createdAt }],
        },
        reserved: { ...set.reserved, [key]: count + 1 },
      },
      status: 'reserved',
      position: null,
    };
  }

  const reservation: Reservation = { key, status: 'waitlist', createdAt };
  const next: ReservationSet = {
    ...set,
    byAccount: { ...set.byAccount, [accountId]: [...account, reservation] },
  };
  return {
    set: next,
    status: 'waitlist',
    position: waitlistPosition(key, createdAt, flatten(next)),
  };
}

/**
 * Cancel a reservation. Freeing a seat promotes the earliest waitlisted reservation for
 * that key across all accounts (count unchanged) unless walk-ins still fill the item;
 * otherwise the count goes down.
 */
export function cancel(
  set: ReservationSet,
  accountId: string,
  key: string,
  capacity = Infinity,
  walkIns = 0,
): { set: ReservationSet; promotedAccountId: string | null } {
  const account = set.byAccount[accountId] ?? [];
  const existing = account.find((r) => r.key === key);
  if (!existing) return { set, promotedAccountId: null };

  const rest = account.filter((r) => r !== existing);
  let next: ReservationSet = {
    ...set,
    byAccount: { ...set.byAccount, [accountId]: rest },
  };

  if (existing.status !== 'reserved') {
    return { set: next, promotedAccountId: null };
  }

  const waitlist = flatten(next)
    .filter((r) => r.key === key && r.status === 'waitlist')
    .sort(byCreatedAt);
  const promoted = waitlist[0];
  const freed = Math.max(0, (next.reserved[key] ?? 0) - 1);
  if (promoted && takenSeats(capacity, freed, walkIns) < capacity) {
    const promotedAccountId = findAccount(next, promoted);
    if (promotedAccountId !== null) {
      next = {
        ...next,
        byAccount: {
          ...next.byAccount,
          [promotedAccountId]: next.byAccount[promotedAccountId].map((r) =>
            r === promoted ? { ...r, status: 'reserved' as const } : r,
          ),
        },
      };
    }
    return { set: next, promotedAccountId };
  }

  next = { ...next, reserved: { ...next.reserved, [key]: freed } };
  return { set: next, promotedAccountId: null };
}
