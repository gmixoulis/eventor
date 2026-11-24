import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { Meeting } from '@/backend/types';

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

describe('backend api', () => {
  it('signs in and signs out', async () => {
    const { api } = loadApi();
    await api.auth.signIn('acct-investor');
    expect((await api.auth.current()).accountId).toBe('acct-investor');
    await api.auth.signOut();
    expect((await api.auth.current()).accountId).toBeNull();
  });

  it('keeps account state isolated between accounts', async () => {
    const { api } = loadApi();
    const founder = await api.me.get('acct-founder');
    expect(founder?.meetings).toHaveLength(5);

    const extra: Meeting = { ...(founder?.meetings[0] as Meeting), id: 'm-extra' };
    await api.me.update('acct-founder', { meetings: [...(founder?.meetings ?? []), extra] });

    expect((await api.me.get('acct-founder'))?.meetings).toHaveLength(6);
    expect((await api.me.get('acct-investor'))?.meetings).toHaveLength(3);
  });

  it('keeps the shared reel like count across accounts', async () => {
    const { api } = loadApi();
    expect((await api.reels.counts())['reel-001']).toBe(214);

    await api.reels.like('reel-001');
    await api.auth.signIn('acct-investor');
    expect((await api.reels.counts())['reel-001']).toBe(215);
    await api.auth.signIn('acct-media');
    expect((await api.reels.counts())['reel-001']).toBe(215);
  });

  it('resetDemoData restores seed state and stays signed in', async () => {
    const { api } = loadApi();
    await api.auth.signIn('acct-founder');
    const founder = await api.me.get('acct-founder');
    await api.me.update('acct-founder', {
      profile: { ...(founder?.profile as NonNullable<typeof founder>['profile']), firstName: 'Mutated' },
    });
    expect((await api.me.get('acct-founder'))?.profile.firstName).toBe('Mutated');

    await api.admin.resetDemoData();
    expect((await api.me.get('acct-founder'))?.profile.firstName).toBe('Alex');
    expect((await api.auth.current()).accountId).toBe('acct-founder');
  });

  it('keeps the device switches and event across account switches and shows them to visitors', async () => {
    const { api } = loadApi();
    const device = { features: { people: false }, event: { name: 'Expo 27', accent: 'teal' as const } };
    await api.auth.signIn('acct-founder');
    await api.device.update(device);
    await api.auth.signIn('acct-investor');
    expect(await api.device.get()).toEqual(device);
    await api.auth.signOut();
    expect(await api.device.get()).toEqual(device);
    await api.me.resetToSeed('acct-founder');
    expect(await api.device.get()).toEqual(device);

    await api.admin.resetDemoData();
    expect(await api.device.get()).toEqual({ features: {}, event: null });
  });

  it('gives back the likes of a deleted account, so liking again does not inflate', async () => {
    const { api } = loadApi();
    const base = (await api.reels.counts())['reel-001'];
    await api.auth.signIn('acct-founder');
    const founder = await api.me.get('acct-founder');
    expect(founder?.reelLikes).not.toContain('reel-001');

    await api.reels.like('reel-001');
    await api.me.update('acct-founder', { reelLikes: [...(founder?.reelLikes ?? []), 'reel-001'] });
    await api.me.resetToSeed('acct-founder');
    expect((await api.reels.counts())['reel-001']).toBe(base);

    await api.auth.signIn('acct-founder');
    await api.reels.like('reel-001');
    expect((await api.reels.counts())['reel-001']).toBe(base + 1);
  });

  it('restores the count of a seed like the deleted account had removed', async () => {
    const { api } = loadApi();
    await api.auth.signIn('acct-investor');
    const investor = await api.me.get('acct-investor');
    const id = investor?.reelLikes[0];
    expect(id).toBeDefined();
    const base = (await api.reels.counts())[id!];

    await api.reels.unlike(id!);
    await api.me.update('acct-investor', { reelLikes: investor!.reelLikes.filter((r) => r !== id) });
    await api.me.resetToSeed('acct-investor');
    expect((await api.reels.counts())[id!]).toBe(base);
  });

  it('stores a created meeting once even if the state write already holds it', async () => {
    const { api } = loadApi();
    const founder = await api.me.get('acct-founder');
    const meeting: Meeting = { ...(founder?.meetings[0] as Meeting), id: 'm-new' };
    await api.me.update('acct-founder', { meetings: [meeting, ...(founder?.meetings ?? [])] });
    await api.meetings.create('acct-founder', meeting);
    await api.organizer.suggestMeeting('acct-founder', meeting);
    const ids = (await api.me.get('acct-founder'))?.meetings.map((m) => m.id) ?? [];
    expect(ids.filter((id) => id === 'm-new')).toHaveLength(1);
  });

  it('lists the meetings of every other account for table assignment', async () => {
    const { api } = loadApi();
    const all = await api.meetings.allForTables('acct-founder');
    const investor = await api.me.get('acct-investor');
    expect(all.length).toBeGreaterThan(0);
    expect(all).toEqual(expect.arrayContaining(investor?.meetings ?? []));
    const founder = await api.me.get('acct-founder');
    expect(all.some((m) => founder?.meetings.some((f) => f.id === m.id))).toBe(false);
  });
});
