import { describe, expect, it } from '@jest/globals';

import type { Reservation } from '@/backend/types';
import {
  cancel,
  reserve,
  waitlistPosition,
  waitlistPositions,
  type ReservationSet,
} from '@/lib/reservations';

function empty(): ReservationSet {
  return { byAccount: {}, reserved: {} };
}

describe('walk-ins count as taken seats', () => {
  it('waitlists once reserved plus walk-ins reach capacity', () => {
    expect(reserve(empty(), 'a', 'k', 50, 't1', 2).status).toBe('reserved');
    const set = { byAccount: {}, reserved: { k: 47 } };
    expect(reserve(set, 'a', 'k', 50, 't1', 2).status).toBe('reserved');
    expect(reserve(set, 'a', 'k', 50, 't1', 3)).toMatchObject({ status: 'waitlist', position: 1 });
  });

  it('a cancel promotes only when the item is no longer full with the walk-ins', () => {
    let set: ReservationSet = { byAccount: {}, reserved: { k: 49 } };
    set = reserve(set, 'a', 'k', 50, 't1').set;
    set = reserve(set, 'b', 'k', 50, 't2').set;
    const stillFull = cancel(set, 'a', 'k', 50, 1);
    expect(stillFull.promotedAccountId).toBeNull();
    expect(stillFull.set.reserved.k).toBe(49);
    const freed = cancel(set, 'a', 'k', 50, 0);
    expect(freed.promotedAccountId).toBe('b');
    expect(freed.set.reserved.k).toBe(50);
  });
});

describe('reserve', () => {
  it('reserves into a free seat', () => {
    const result = reserve(empty(), 'a', 'session:s1', 2, 't1');
    expect(result.status).toBe('reserved');
    expect(result.position).toBeNull();
    expect(result.set.reserved['session:s1']).toBe(1);
    expect(result.set.byAccount['a']).toHaveLength(1);
  });

  it('waitlists when full and reports positions in createdAt order', () => {
    let set = reserve(empty(), 'a', 'session:s1', 1, 't1').set;
    const b = reserve(set, 'b', 'session:s1', 1, 't2');
    expect(b.status).toBe('waitlist');
    expect(b.position).toBe(1);
    set = b.set;
    const c = reserve(set, 'c', 'session:s1', 1, 't3');
    expect(c.position).toBe(2);
  });

  it('is idempotent for the same account and key', () => {
    const first = reserve(empty(), 'a', 'session:s1', 2, 't1');
    const second = reserve(first.set, 'a', 'session:s1', 2, 't2');
    expect(second.status).toBe('reserved');
    expect(second.set.byAccount['a']).toHaveLength(1);
    expect(second.set.reserved['session:s1']).toBe(1);
  });
});

describe('cancel', () => {
  it('frees a seat with no waitlist and decrements the count', () => {
    const set = reserve(empty(), 'a', 'session:s1', 2, 't1').set;
    const result = cancel(set, 'a', 'session:s1');
    expect(result.promotedAccountId).toBeNull();
    expect(result.set.reserved['session:s1']).toBe(0);
    expect(result.set.byAccount['a']).toHaveLength(0);
  });

  it('promotes the earliest waitlist across accounts, keeping the count unchanged', () => {
    let set = reserve(empty(), 'a', 'session:s1', 1, 't1').set;
    set = reserve(set, 'b', 'session:s1', 1, 't2').set;
    set = reserve(set, 'c', 'session:s1', 1, 't3').set;
    const result = cancel(set, 'a', 'session:s1');
    expect(result.promotedAccountId).toBe('b');
    expect(result.set.reserved['session:s1']).toBe(1);
    expect(result.set.byAccount['b'][0].status).toBe('reserved');
    expect(result.set.byAccount['c'][0].status).toBe('waitlist');
  });

  it('removing a waitlist reservation leaves the count unchanged', () => {
    let set = reserve(empty(), 'a', 'session:s1', 1, 't1').set;
    set = reserve(set, 'b', 'session:s1', 1, 't2').set;
    const result = cancel(set, 'b', 'session:s1');
    expect(result.promotedAccountId).toBeNull();
    expect(result.set.reserved['session:s1']).toBe(1);
  });

  it('never drops the count below zero', () => {
    let set = reserve(empty(), 'a', 'session:s1', 1, 't1').set;
    set = cancel(set, 'a', 'session:s1').set;
    const again = cancel(set, 'a', 'session:s1');
    expect(again.set.reserved['session:s1']).toBe(0);
  });
});

describe('waitlistPosition', () => {
  it('sorts by createdAt', () => {
    const list: Reservation[] = [
      { key: 'k', status: 'waitlist', createdAt: '2026-05-28T10:00:02' },
      { key: 'k', status: 'waitlist', createdAt: '2026-05-28T10:00:00' },
      { key: 'k', status: 'waitlist', createdAt: '2026-05-28T10:00:01' },
    ];
    expect(waitlistPosition('k', '2026-05-28T10:00:01', list)).toBe(2);
    expect(waitlistPosition('k', '2026-05-28T10:00:00', list)).toBe(1);
  });
});

describe('waitlistPositions', () => {
  it("lists only the account's waitlisted keys, positioned across accounts", () => {
    let set = reserve(empty(), 'a', 'k1', 1, 't1').set;
    set = reserve(set, 'b', 'k1', 1, 't2').set;
    set = reserve(set, 'c', 'k1', 1, 't3').set;
    set = reserve(set, 'c', 'k2', 5, 't4').set;
    expect(waitlistPositions(set.byAccount, 'c')).toEqual({ k1: 2 });
    expect(waitlistPositions(set.byAccount, 'a')).toEqual({});
    const after = cancel(set, 'a', 'k1').set;
    expect(waitlistPositions(after.byAccount, 'c')).toEqual({ k1: 1 });
  });
});
