import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import seed from '@/backend/seed-db.json';
import { normalizeDevice, normalizeState, toWholeHours } from '@/backend/state';
import { agendaKey } from '@/lib/agenda-item';

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

describe('normalizeState networking', () => {
  it('defaults networking to true when the stored field is missing', () => {
    expect(
      normalizeState({ profile: { id: 'x', selections: [], availability: [] } }).profile.networking,
    ).toBe(true);
  });

  it('keeps an explicit false', () => {
    expect(normalizeState({ profile: { id: 'x', networking: false } }).profile.networking).toBe(
      false,
    );
  });

  it('keeps an explicit true', () => {
    expect(normalizeState({ profile: { id: 'x', networking: true } }).profile.networking).toBe(
      true,
    );
  });
});

describe('demo accounts after sign-in', () => {
  it('every demo account signs in with networking on and at least 3 selections', async () => {
    const { api } = loadApi();
    for (const id of ['acct-founder', 'acct-investor', 'acct-corporate', 'acct-media']) {
      await api.auth.signIn(id);
      const state = await api.me.get(id);
      expect(state?.profile.networking).toBe(true);
      // The match profile's selections are `profile.selections` (buildMe in store/index.tsx).
      expect(state?.profile.selections.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('availability is stored in whole hours', () => {
  it('maps half hours to their hour and de-duplicates', () => {
    expect(toWholeHours(['2026-05-28T10:30', '2026-05-28T10:00', '2026-05-28T11:30'])).toEqual([
      '2026-05-28T10:00',
      '2026-05-28T11:00',
    ]);
  });

  it('normalizes a stored state with half-hour availability', () => {
    const state = normalizeState({
      profile: { availability: ['2026-05-28T09:30', '2026-05-28T09:00'] },
    });
    expect(state.profile.availability).toEqual(['2026-05-28T09:00']);
  });

  it('the seed holds whole hours only', () => {
    for (const state of Object.values(seed.states)) {
      for (const entry of state.profile.availability) expect(entry.endsWith(':00')).toBe(true);
    }
  });
});

describe('stored state from before the five features', () => {
  it('loads with every new field defaulted', () => {
    const old = {
      profile: { id: 'x' },
      settings: { use24h: true },
      bookmarks: { mySessions: ['s1'] },
    };
    const state = normalizeState(old);
    expect(state.reservations).toEqual([]);
    expect(state.tickets).toEqual([]);
    expect(state.mySideEvents).toEqual([]);
    expect(state.reminders).toEqual(['session:s1']); // reminders are on by default
    expect(state.dismissedReminders).toEqual([]);
    expect(state.follows).toEqual({ speakers: [] });
    expect(state.stamps).toEqual([]);
    expect(state.settings.use24h).toBe(true);
    expect(state.settings.demoClock?.anchor).toBe('2026-05-28T10:05');
  });

  it('keeps known settings and drops the switches and event earlier v0.4 builds saved per account', () => {
    const old = { cacheEnabled: false, notifications: false, use24h: true, appearance: 'dark' };
    const settings = normalizeState({ settings: { ...old, features: { sponsors: false }, event: { name: 'Expo 27', accent: 'teal' }, constructor: 'x' } }).settings;
    expect(settings).toMatchObject(old);
    expect(Object.keys(settings).sort()).toEqual(['appearance', 'cacheEnabled', 'demoClock', 'notifications', 'use24h']);
  });

  it('keeps real time (null) and replaces a malformed demo clock', () => {
    expect(normalizeState({ settings: { demoClock: null } }).settings.demoClock).toBeNull();
    expect(normalizeState({ settings: { demoClock: 'soon' } }).settings.demoClock?.anchor).toBe(
      '2026-05-28T10:05',
    );
  });

  it('replaces a demo clock whose anchor or start does not parse to a date', () => {
    const fallback = '2026-05-28T10:05';
    const badAnchor = { anchor: 'not a time', startedAt: '2026-11-20T08:00:00.000Z' };
    const badStart = { anchor: '2026-05-29T16:45', startedAt: 'yesterday' };
    expect(normalizeState({ settings: { demoClock: badAnchor } }).settings.demoClock?.anchor).toBe(fallback);
    expect(normalizeState({ settings: { demoClock: badStart } }).settings.demoClock?.anchor).toBe(fallback);
    const good = { anchor: '2026-05-29T16:45', startedAt: '2026-11-20T08:00:00.000Z' };
    expect(normalizeState({ settings: { demoClock: good } }).settings.demoClock).toEqual(good);
  });

  it('a stored database without the reserved counters gets the seed seat counts', async () => {
    mockStorage.set('eventor:db:v1', JSON.stringify({ ...seed, shared: { reelLikes: {} } }));
    const { api } = loadApi();
    expect(await api.reservations.counts()).toEqual(seed.shared.reserved);
    expect((await api.me.get('acct-founder'))?.stamps).toEqual([]);
  });
});

describe('device settings', () => {
  it('loads missing or malformed switches and event as the defaults', () => {
    for (const raw of [undefined, null, 'x', {}, { features: ['sponsors'], event: { name: 'Expo 27', accent: 'gold' } }]) {
      expect(normalizeDevice(raw)).toEqual({ features: {}, event: null });
    }
  });

  it('keeps valid switches and event, dropping unknown ids, non-booleans and default values', () => {
    const raw = { features: { sponsors: false, schedule: true, admin: false, map: 'off' }, event: { name: 'Expo 27', accent: 'teal' } };
    expect(normalizeDevice(raw)).toEqual({ features: { sponsors: false }, event: { name: 'Expo 27', accent: 'teal' } });
  });
});

it('a null meeting entry is dropped instead of resetting the stored state', () => {
  const state = normalizeState({ meetings: [null, { id: 'm1', start: '2027-05-10T10:00:00.000Z' }] });
  expect(state.meetings).toHaveLength(1);
  expect(state.meetings[0].createdAt).toBe('2027-05-10T10:00:00.000Z');
  expect(state.reminders).toEqual([agendaKey('meeting', 'm1')]);
});
