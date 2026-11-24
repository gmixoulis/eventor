import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

const DB_KEY = 'eventor:db:v1';
const BACKUP_KEY = 'eventor:db:v1:backup';

declare const require: (id: string) => unknown;

function loadDb(): typeof import('@/backend/db') {
  jest.resetModules();
  return require('@/backend/db') as typeof import('@/backend/db');
}

beforeEach(() => {
  mockStorage.clear();
});

describe('demo database', () => {
  it('loads the seed when nothing is stored', async () => {
    const db = loadDb();
    const loaded = await db.load();
    expect(db.isFresh()).toBe(true);
    expect(loaded.session.accountId).toBeNull();
    expect(Object.keys(loaded.accounts)).toHaveLength(4);
    expect(loaded.states['acct-founder'].meetings).toHaveLength(5);
    expect(loaded.shared.reelLikes['reel-001']).toBe(214);
  });

  it('persists a write and returns it on reload', async () => {
    jest.useFakeTimers();
    try {
      const db = loadDb();
      await db.load();
      db.getDb().states['acct-founder'].profile.firstName = 'Changed';
      db.scheduleWrite();
      jest.advanceTimersByTime(301);

      const fresh = loadDb();
      const reloaded = await fresh.load();
      expect(reloaded.states['acct-founder'].profile.firstName).toBe('Changed');
      expect(fresh.isFresh()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('falls back to the seed on a corrupt stored value, keeping a backup and a flag', async () => {
    mockStorage.set(DB_KEY, '{not valid json');
    const db = loadDb();
    expect(db.wasReset()).toBe(false);
    const loaded = await db.load();
    expect(loaded.states['acct-founder'].meetings).toHaveLength(5);
    expect(mockStorage.get(BACKUP_KEY)).toBe('{not valid json');
    expect(db.wasReset()).toBe(true);
  });

  it('fills a stored value that parses but lacks session and accounts', async () => {
    const seedDb = loadDb().getDb();
    const stored = { version: 1, states: { 'acct-founder': seedDb.states['acct-founder'] } };
    stored.states['acct-founder'].profile.firstName = 'Kept';
    mockStorage.set(DB_KEY, JSON.stringify(stored));
    const db = loadDb();
    const loaded = await db.load();
    expect(loaded.session.accountId).toBeNull();
    expect(Object.keys(loaded.accounts)).toHaveLength(4);
    expect(loaded.states['acct-founder'].profile.firstName).toBe('Kept');
    expect(loaded.states['acct-investor'].meetings).toHaveLength(3);
    expect(loaded.shared.reelLikes).toEqual({});
    expect(db.wasReset()).toBe(false);
  });

  it('loads a database from the previous release without losing data, seeding the seat counts', async () => {
    const seedDb = loadDb().getDb();
    // The previous release: shared held only reel likes, states had none of the five-feature keys.
    const states: Record<string, unknown> = {};
    for (const [id, state] of Object.entries(seedDb.states)) {
      const { reservations, stamps, reminders, follows, ...rest } = state;
      void [reservations, stamps, reminders, follows];
      states[id] = { ...rest, settings: { ...rest.settings, demoClock: undefined } };
    }
    const founder = states['acct-founder'] as typeof seedDb.states['acct-founder'];
    founder.profile.firstName = 'Kept';
    founder.reelLikes = ['reel-001'];
    const stored = { ...seedDb, session: { accountId: 'acct-founder' }, states, shared: { reelLikes: { 'reel-001': 300 } } };
    mockStorage.set(DB_KEY, JSON.stringify(stored));

    const db = loadDb();
    const loaded = await db.load();
    expect(db.wasReset()).toBe(false);
    expect(loaded.shared.reserved['session:s-hiring-first-ten']).toBe(25); // capacity 25: full
    expect(loaded.shared.reserved['side-event:se-investor-roundtables']).toBe(35); // capacity 35: full
    expect(loaded.shared.reelLikes).toEqual({ 'reel-001': 300 });
    expect(loaded.session.accountId).toBe('acct-founder');
    const state = loaded.states['acct-founder'];
    expect(state.profile.firstName).toBe('Kept');
    expect(state.reelLikes).toEqual(['reel-001']);
    expect(state.meetings).toHaveLength(5);
    expect(state.reservations).toEqual([]);
    expect(state.tickets).toEqual([]);
    expect(state.stamps).toEqual([]);
    expect(state.follows).toEqual({ speakers: [] });
    expect(state.settings.demoClock?.anchor).toBe('2026-05-28T10:05');
    expect(loaded.device).toEqual({ features: {}, event: null });
  });

  it('seeds sub-admins when an old database has no shared object', () => {
    const db = loadDb();
    const { shared, ...old } = db.getDb();
    const normalized = db.normalizeDb(old);
    expect(normalized?.shared.sideEventAdmins).toEqual(shared.sideEventAdmins);
    expect(normalized?.shared.sideEventAdmins['se-pitch-clinic']).toBe('acct-investor');
    expect(normalized?.shared.applications).toEqual([]);
    expect(normalized?.states['acct-founder'].profile).toEqual(old.states['acct-founder'].profile);
  });

  it('fills emails, the admin, requests and sub-admins into a database from before v0.5', async () => {
    const seedDb = loadDb().getDb();
    const accounts: Record<string, unknown> = {};
    for (const [id, account] of Object.entries(seedDb.accounts)) {
      const { email, permission, ...rest } = account;
      void [email, permission];
      accounts[id] = rest;
    }
    accounts['acct-guest'] = { ...(accounts['acct-media'] as object), id: 'acct-guest' };
    const { applications, sideEventAdmins, ...shared } = seedDb.shared;
    void [applications, sideEventAdmins];
    shared.reserved = { ...shared.reserved, 'side-event:se-pitch-clinic': 3 };
    mockStorage.set(DB_KEY, JSON.stringify({ ...seedDb, session: { accountId: 'acct-media' }, accounts, shared }));

    const db = loadDb();
    const loaded = await db.load();
    expect(db.wasReset()).toBe(false);
    expect(loaded.accounts['acct-founder']).toMatchObject({ email: 'alex.demo@example.com', permission: 'admin' });
    expect(loaded.accounts['acct-media'].email).toBe('priya.nair@example.com');
    expect(loaded.accounts['acct-media'].permission).toBeUndefined();
    expect(loaded.accounts['acct-guest'].email).toBe('');
    expect(loaded.shared.applications).toEqual([]);
    expect(loaded.shared.sideEventAdmins).toEqual({
      'se-investor-roundtables': 'acct-investor',
      'se-pitch-clinic': 'acct-investor',
    });
    expect(loaded.shared.reserved['side-event:se-pitch-clinic']).toBe(3);
    expect(loaded.session.accountId).toBe('acct-media');
  });

  it('moves the switches and event earlier v0.4 builds saved per account to the device, from the signed-in account', async () => {
    const seedDb = loadDb().getDb();
    const { device, ...older } = seedDb;
    void device;
    const founder = seedDb.states['acct-founder'];
    const investor = seedDb.states['acct-investor'];
    const states = {
      ...seedDb.states,
      'acct-founder': { ...founder, settings: { ...founder.settings, use24h: true, features: { people: false }, event: { name: 'Expo 27', accent: 'teal' } } },
      'acct-investor': { ...investor, settings: { ...investor.settings, features: { map: false } } },
    };
    mockStorage.set(DB_KEY, JSON.stringify({ ...older, session: { accountId: 'acct-founder' }, states }));

    const db = loadDb();
    const loaded = await db.load();
    expect(db.wasReset()).toBe(false);
    expect(loaded.device).toEqual({ features: { people: false }, event: { name: 'Expo 27', accent: 'teal' } });
    expect(loaded.states['acct-founder'].settings.use24h).toBe(true);
    for (const state of Object.values(loaded.states)) {
      expect(Object.keys(state.settings).sort()).toEqual(['appearance', 'cacheEnabled', 'demoClock', 'notifications', 'use24h']);
    }

    // Signed out, no account is current, so the device starts from the defaults.
    mockStorage.set(DB_KEY, JSON.stringify({ ...older, session: { accountId: null }, states }));
    expect((await loadDb().load()).device).toEqual({ features: {}, event: null });
  });

  it('keeps a saved device setting across reloads, ahead of any per-account leftovers', async () => {
    jest.useFakeTimers();
    try {
      const db = loadDb();
      await db.load();
      const founder = db.getDb().states['acct-founder'];
      Object.assign(founder.settings, { features: { map: false } });
      db.getDb().session.accountId = 'acct-founder';
      db.getDb().device = { features: { reels: false }, event: { name: 'Harbour Days', accent: 'ink' } };
      db.scheduleWrite();
      jest.advanceTimersByTime(301);

      const reloaded = await loadDb().load();
      expect(reloaded.device).toEqual({ features: { reels: false }, event: { name: 'Harbour Days', accent: 'ink' } });
    } finally {
      jest.useRealTimers();
    }
  });

  it('treats a stored value that is not a database object as unusable', async () => {
    mockStorage.set(DB_KEY, '[1,2,3]');
    const db = loadDb();
    await db.load();
    expect(mockStorage.get(BACKUP_KEY)).toBe('[1,2,3]');
    expect(db.wasReset()).toBe(true);
  });

  it('retries a failed write and flags it only after every retry failed', async () => {
    jest.useFakeTimers();
    const db = loadDb();
    // loadDb reset the module registry, so read the mock instance db.ts now uses.
    const { default: storage } = require('@react-native-async-storage/async-storage') as {
      default: { setItem: jest.Mock<(k: string, v: string) => Promise<void>> };
    };
    const setItem = storage.setItem;
    try {
      await db.load();
      setItem.mockImplementation(async () => {
        throw new Error('disk full');
      });
      db.getDb().states['acct-founder'].profile.firstName = 'Unsaved';
      db.scheduleWrite();
      // Debounce, then three retries with growing backoff.
      for (const wait of [301, 600, 1200]) {
        await jest.advanceTimersByTimeAsync(wait);
        expect(db.saveFailed()).toBe(false);
      }
      await jest.advanceTimersByTimeAsync(2400);
      expect(db.saveFailed()).toBe(true);
      expect(setItem).toHaveBeenCalledTimes(4);

      setItem.mockImplementation(async (key: string, value: string) => {
        mockStorage.set(key, value);
      });
      db.scheduleWrite();
      await jest.advanceTimersByTimeAsync(301);
      expect(db.saveFailed()).toBe(false);
      expect(JSON.parse(mockStorage.get(DB_KEY)!).states['acct-founder'].profile.firstName).toBe('Unsaved');
    } finally {
      setItem.mockImplementation(async (key: string, value: string) => {
        mockStorage.set(key, value);
      });
      jest.useRealTimers();
    }
  });

  it('imports the old store key into the founder account once and then removes it', async () => {
    mockStorage.set(
      'eventor:store',
      JSON.stringify({
        profile: {
          id: 'me',
          firstName: 'Legacy',
          lastName: 'User',
          title: 'CEO',
          company: 'Legacy Co',
          role: 'Startup',
          industry: '',
          intro: '',
          selections: [],
          networking: true,
          countries: [],
          availability: [],
          blocked: [],
          social: {},
        },
        meetings: [],
      }),
    );
    const db = loadDb();
    const loaded = await db.load();
    expect(loaded.session.accountId).toBe('acct-founder');
    expect(loaded.states['acct-founder'].profile.firstName).toBe('Legacy');
    expect(mockStorage.has('eventor:store')).toBe(false);
    expect(JSON.parse(mockStorage.get(DB_KEY)!).states['acct-founder'].profile.firstName).toBe('Legacy');
  });
});
