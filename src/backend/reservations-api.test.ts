import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getSideEvent } from '@/data';
import { sideEventToItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { liveStatus } from '@/lib/live-status';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
    getAllKeys: jest.fn(async () => Array.from(mockStorage.keys())),
    multiRemove: jest.fn(async (keys: string[]) => keys.forEach((k) => mockStorage.delete(k))),
  },
}));

declare const require: (id: string) => unknown;

function loadApi(): typeof import('@/backend/api') {
  jest.resetModules();
  return require('@/backend/api') as typeof import('@/backend/api');
}

beforeEach(() => {
  mockStorage.clear();
});

// Seeded at 42 of 45 seats.
const KEY = 'session:s-openai-for-startups';
// Long before the event, so no simulated walk-ins count yet.
const EARLY = new Date('2026-01-01T00:00:00Z');

describe('reservations api', () => {
  it('reserves, waitlists when full, and is idempotent', async () => {
    const { api } = loadApi();
    expect(await api.reservations.reserve('acct-founder', KEY, 43, EARLY)).toMatchObject({
      status: 'reserved',
      position: null,
    });
    expect((await api.reservations.counts())[KEY]).toBe(43);
    expect(await api.reservations.reserve('acct-investor', KEY, 43, EARLY)).toMatchObject({
      status: 'waitlist',
      position: 1,
    });
    expect(await api.reservations.reserve('acct-media', KEY, 43, EARLY)).toMatchObject({ position: 2 });
    expect(await api.reservations.reserve('acct-investor', KEY, 43, EARLY)).toMatchObject({ position: 1 });
    expect(await api.reservations.positions('acct-media')).toEqual({ [KEY]: 2 });
  });

  it('cancel promotes the earliest waitlisted account and tells it', async () => {
    const { api } = loadApi();
    await api.reservations.reserve('acct-founder', KEY, 43, EARLY);
    await api.reservations.reserve('acct-investor', KEY, 43, EARLY);
    expect(await api.reservations.cancel('acct-founder', KEY, EARLY)).toEqual({
      promotedAccountId: 'acct-investor',
    });
    expect((await api.reservations.counts())[KEY]).toBe(43);
    const investor = await api.me.get('acct-investor');
    expect(investor?.reservations[0].status).toBe('reserved');
    expect(investor?.activity[0]).toMatchObject({
      kind: 'promotion',
      title: 'A seat opened: you are in for Atlas AI for Startups',
    });
  });

  it('cancel without a waitlist gives the seat back', async () => {
    const { api } = loadApi();
    await api.reservations.reserve('acct-founder', KEY, 45, EARLY);
    await api.reservations.cancel('acct-founder', KEY, EARLY);
    expect((await api.reservations.counts())[KEY]).toBe(42);
  });

  it('deleting an account gives back its seats, promotes the waitlist and resets its stamps', async () => {
    const { api } = loadApi();
    await api.reservations.reserve('acct-founder', KEY, 45, EARLY);
    await api.reservations.reserve('acct-founder', 'side-event:se-robotics-demo', 75, EARLY);
    await api.reservations.reserve('acct-corporate', KEY, 43, EARLY);
    await api.reservations.reserve('acct-corporate', KEY, 43, EARLY);
    await api.passport.collect('acct-founder', 'sponsor:sponsor-nbg');
    const before = (await api.passport.leaderboard()).find((r) => r.accountId === 'acct-founder');
    expect(before?.points).toBe(15);

    await api.me.resetToSeed('acct-founder');

    const counts = await api.reservations.counts();
    expect(counts[KEY]).toBe(43); // the corporate account moved up into the freed seat
    expect(counts['side-event:se-robotics-demo']).toBe(0);
    expect((await api.me.get('acct-corporate'))?.reservations[0].status).toBe('reserved');
    expect((await api.me.get('acct-founder'))?.reservations).toEqual([]);
    const after = (await api.passport.leaderboard()).find((r) => r.accountId === 'acct-founder');
    expect(after?.points).toBe(0);
  });
});

describe('reserving counts the same walk-ins the live status shows', () => {
  // Seeded at 47 of 50; starts 2026-05-28 at 14:00.
  const WORKSHOP = 'side-event:se-ai-workshop';
  const at = (time: string) => new Date(wallTimeMs(`2026-05-28T${time}`));

  async function workshop(api: typeof import('@/backend/api')['api']) {
    const event = getSideEvent('se-ai-workshop');
    if (!event) throw new Error('missing seed side event');
    return { item: sideEventToItem(event), reserved: (await api.reservations.counts())[WORKSHOP] ?? 0 };
  }

  it('45 minutes before the start the pill shows 3 seats left and the user gets a seat', async () => {
    const { api } = loadApi();
    const { item, reserved } = await workshop(api);
    expect(reserved).toBe(47);
    expect(liveStatus(item, at('13:15'), reserved).label).toBe('Filling up · 3 seats left');
    expect(await api.reservations.reserve('acct-founder', WORKSHOP, 50, at('13:15'))).toMatchObject({
      status: 'reserved',
    });
  });

  it('once walk-ins fill it the pill shows Full and the user joins the waitlist', async () => {
    const { api } = loadApi();
    const { item, reserved } = await workshop(api);
    expect(liveStatus(item, at('13:30'), reserved).level).toBe('full');
    expect(await api.reservations.reserve('acct-founder', WORKSHOP, 50, at('13:30'))).toMatchObject({
      status: 'waitlist',
      position: 1,
    });
    expect((await api.reservations.counts())[WORKSHOP]).toBe(47);
  });

  it('a freed seat promotes the waitlist only when the item is no longer full', async () => {
    const { api } = loadApi();
    await api.reservations.reserve('acct-founder', WORKSHOP, 50, at('13:15'));
    await api.reservations.reserve('acct-investor', WORKSHOP, 50, at('13:30'));
    // Walk-ins still fill the room at 13:30, so the seat goes back and nobody moves up.
    expect(await api.reservations.cancel('acct-founder', WORKSHOP, at('13:30'))).toEqual({
      promotedAccountId: null,
    });
    expect((await api.reservations.counts())[WORKSHOP]).toBe(47);
    expect((await api.me.get('acct-investor'))?.reservations[0].status).toBe('waitlist');
  });

  it('a freed seat before the walk-ins arrive promotes the earliest waitlisted account', async () => {
    const { api } = loadApi();
    for (const id of ['acct-founder', 'acct-corporate', 'acct-media']) {
      await api.reservations.reserve(id, WORKSHOP, 50, at('13:15'));
    }
    await api.reservations.reserve('acct-investor', WORKSHOP, 50, at('13:15'));
    expect(await api.reservations.cancel('acct-founder', WORKSHOP, at('13:15'))).toEqual({
      promotedAccountId: 'acct-investor',
    });
    expect((await api.reservations.counts())[WORKSHOP]).toBe(50);
  });
});

describe('passport api', () => {
  it('gives every account on 0 points, the signed-in one included, the same rank', async () => {
    const { api } = loadApi();
    await api.auth.signIn('acct-corporate');
    const board = await api.passport.leaderboard();
    const zero = board.filter((r) => r.points === 0);
    expect(zero.length).toBeGreaterThan(1);
    const firstZero = board.findIndex((r) => r.points === 0) + 1;
    for (const row of zero) expect(row.rank).toBe(firstZero);
    expect(board.find((r) => r.accountId === 'acct-corporate')?.rank).toBe(firstZero);
    expect(board[0].rank).toBe(1);
  });

  it('collects once and ranks every account with the twelve sample attendees', async () => {
    const { api } = loadApi();
    expect(await api.passport.collect('acct-founder', 'place:place-registration')).toBe(true);
    expect(await api.passport.collect('acct-founder', 'place:place-registration')).toBe(false);
    const board = await api.passport.leaderboard();
    expect(board).toHaveLength(16);
    for (let i = 1; i < board.length; i++) {
      expect(board[i - 1].points).toBeGreaterThanOrEqual(board[i].points);
      // Equal points share the rank of the first entry with those points; otherwise rank is position.
      expect(board[i].rank).toBe(board[i - 1].points === board[i].points ? board[i - 1].rank : i + 1);
    }
    expect(board.filter((r) => r.accountId === null)).toHaveLength(12);
  });
});
