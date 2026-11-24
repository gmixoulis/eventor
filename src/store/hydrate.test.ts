import { describe, expect, it, jest } from '@jest/globals';

import { api } from '@/backend/api';
import { makeGuestState } from '@/backend/state';
import type { StoreState } from '@/backend/types';
import { loadInitialSession, loadSession, withRestartedClock } from '@/store/hydrate';

// jest.mock is hoisted above the imports.

jest.mock('@/backend/api', () => ({
  api: {
    auth: { current: jest.fn(async () => Promise.reject(new Error('storage exploded'))) },
    accounts: {
      list: jest.fn(async () => []),
      seedList: jest.fn(() => [{ id: 'acct-founder', name: 'Alex' }]),
    },
    me: { get: jest.fn() },
    device: { get: jest.fn(async () => ({ features: { people: false }, event: { name: 'Expo 27', accent: 'teal' } })) },
    reels: { counts: jest.fn(async () => ({})) },
    reservations: { counts: jest.fn(async () => ({})), positions: jest.fn(async () => ({})) },
    applications: { admins: jest.fn(async () => ({})) },
  },
}));

const stale = { anchor: '2026-05-28T10:05', startedAt: '2026-11-18T08:00:00.000Z' };

function stateWithClock(demoClock: StoreState['settings']['demoClock']): StoreState {
  const base = makeGuestState();
  return { ...base, settings: { ...base.settings, demoClock } };
}

describe('launch hydration', () => {
  it('falls back to a guest with the seed accounts instead of rejecting', async () => {
    const initial = await loadInitialSession();
    expect(initial.accountId).toBeNull();
    expect(initial.state.profile.id).toBe('guest');
    expect(initial.accounts.map((a) => a.id)).toEqual(['acct-founder']);
    expect(initial.dataReset).toBe(true);
    expect(initial.device).toEqual({ features: {}, event: null });
  });

  it('gives a visitor the device switches and event too', async () => {
    jest.mocked(api.auth.current).mockResolvedValueOnce({ accountId: null, fresh: false, dataReset: false });
    const session = await loadSession();
    expect(session.state.profile.id).toBe('guest');
    expect(session.device).toEqual({ features: { people: false }, event: { name: 'Expo 27', accent: 'teal' } });
  });

  it('restarts a signed-in account preset clock at its anchor when the session loads', async () => {
    jest.mocked(api.auth.current).mockResolvedValueOnce({ accountId: 'acct-founder', fresh: false, dataReset: false });
    jest.mocked(api.me.get).mockResolvedValueOnce(stateWithClock(stale));
    const before = Date.now();
    const session = await loadSession();
    const clock = session.state.settings.demoClock;
    expect(clock?.anchor).toBe(stale.anchor);
    expect(Date.parse(clock?.startedAt ?? '')).toBeGreaterThanOrEqual(before);
  });
});

describe('withRestartedClock', () => {
  const real = new Date('2026-11-20T09:00:00.000Z');
  it('restarts a preset and keeps real time as is', () => {
    expect(withRestartedClock(stateWithClock(stale), real).settings.demoClock).toEqual({
      anchor: stale.anchor,
      startedAt: real.toISOString(),
    });
    const realTime = stateWithClock(null);
    expect(withRestartedClock(realTime, real)).toBe(realTime);
  });
});
