import AsyncStorage from '@react-native-async-storage/async-storage';

import seed from '@/backend/seed-db.json';
import { isRecord, normalizeDevice, normalizeState } from '@/backend/state';
import type { Account, Db, StoreState } from '@/backend/types';

export const DB_KEY = 'eventor:db:v1';
const OLD_STORE_KEY = 'eventor:store';
const OLD_REELS_KEY = 'eventor:reels';
export const BACKUP_KEY = 'eventor:db:v1:backup';
const WRITE_DEBOUNCE_MS = 300;
const WRITE_RETRIES = 3;

let cache: Db | null = null;
let seedDb: Db | null = null;
let fresh = false;
let dataReset = false;
let writeFailed = false;
const saveListeners = new Set<() => void>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The normalized seed database, used as the source for fresh runs and resets. */
function getSeed(): Db {
  if (!seedDb) {
    const raw = clone(seed as unknown as Db);
    raw.session = { accountId: null };
    for (const id of Object.keys(raw.states)) {
      raw.states[id] = normalizeState(raw.states[id]);
    }
    raw.device = normalizeDevice(raw.device);
    seedDb = raw;
  }
  return seedDb;
}

/**
 * Validate and normalize a parsed stored database. Missing session, accounts, account states,
 * device settings, shared counters, requests and sub-admins are filled from the seed; returns null when the value is not a database.
 */
export function normalizeDb(raw: unknown): Db | null {
  if (!isRecord(raw)) return null;
  const db = raw as Partial<Db>;
  const base = getSeed();
  const accounts = isRecord(db.accounts) ? db.accounts : clone(base.accounts);
  const states: Record<string, StoreState> = isRecord(db.states) ? db.states : {};
  const sessionId = isRecord(db.session) ? db.session.accountId : null;
  const accountId = typeof sessionId === 'string' && accounts[sessionId] ? sessionId : null;
  // Earlier v0.4 builds saved the switches and the event in each account's settings: the signed-in account's carry over.
  const legacy = accountId && isRecord(states[accountId]) ? states[accountId].settings : undefined;
  const device = normalizeDevice(isRecord(db.device) ? db.device : legacy);
  for (const id of Object.keys(states)) {
    states[id] = normalizeState(states[id]);
  }
  for (const id of Object.keys(accounts)) {
    if (!states[id] && base.states[id]) states[id] = clone(base.states[id]);
    // Accounts from before v0.5 have no email and no permission: take both from the seed account with the same id.
    if (typeof accounts[id].email !== 'string') {
      accounts[id].email = base.accounts[id]?.email ?? '';
      if (base.accounts[id]?.permission) accounts[id].permission = base.accounts[id].permission;
    }
  }
  // A database from before reservations has no counters: start them from the seed's seat counts.
  const shared: Partial<Db['shared']> = isRecord(db.shared)
    ? db.shared
    : { reelLikes: {}, reserved: clone(base.shared.reserved) };
  if (!isRecord(shared.reelLikes)) shared.reelLikes = {};
  if (!isRecord(shared.reserved)) shared.reserved = clone(base.shared.reserved);
  // A database from before side-event requests: no requests yet, and the seed's sub-admins.
  if (!Array.isArray(shared.applications)) shared.applications = [];
  if (!isRecord(shared.sideEventAdmins)) shared.sideEventAdmins = clone(base.shared.sideEventAdmins);
  const visitorEmail = isRecord(db.session) && typeof db.session.visitorEmail === 'string' ? db.session.visitorEmail : undefined;
  return {
    version: 1, session: { accountId, visitorEmail }, accounts, states, device,
    shared: {
      reelLikes: shared.reelLikes, reserved: shared.reserved,
      applications: shared.applications, sideEventAdmins: shared.sideEventAdmins,
    },
  };
}

export function getDb(): Db {
  if (!cache) cache = clone(getSeed());
  return cache;
}

export function isFresh(): boolean {
  return fresh;
}

/** True when the stored database could not be used and was reset (a backup was kept). */
export function wasReset(): boolean {
  return dataReset;
}

/** True after a database write failed every retry; cleared by the next successful write. */
export function saveFailed(): boolean {
  return writeFailed;
}

/** Called whenever saveFailed() changes. Returns an unsubscribe function. */
export function onSaveFailedChange(listener: () => void): () => void {
  saveListeners.add(listener);
  return () => {
    saveListeners.delete(listener);
  };
}

function setWriteFailed(value: boolean): void {
  if (writeFailed === value) return;
  writeFailed = value;
  for (const listener of saveListeners) listener();
}

async function importOldStore(): Promise<StoreState | null> {
  try {
    const raw = await AsyncStorage.getItem(OLD_STORE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as Partial<StoreState>);
  } catch {
    return null;
  }
}

/** Save the database holding the imported store, then drop the old key so it is never re-imported. */
async function retireOldStore(db: Db): Promise<void> {
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
    await AsyncStorage.removeItem(OLD_STORE_KEY);
  } catch {
    // Keep the old key when the new database could not be saved; the import runs again next launch.
  }
}

/** One-time import of the old standalone reels key into the founder's state and shared counts. */
async function importOldReels(founderId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OLD_REELS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { liked?: unknown; saved?: unknown };
    const liked = Array.isArray(parsed.liked) ? parsed.liked.filter((x) => typeof x === 'string') : [];
    const saved = Array.isArray(parsed.saved) ? parsed.saved.filter((x) => typeof x === 'string') : [];
    const db = getDb();
    const state = db.states[founderId];
    if (!state) return; // keep the old key; nothing to import into yet
    // Count only new likes, so a retry after a failed save does not count them twice.
    for (const id of new Set(liked)) {
      if (!state.reelLikes.includes(id) && typeof db.shared.reelLikes[id] === 'number') db.shared.reelLikes[id] += 1;
    }
    state.reelLikes = [...new Set([...state.reelLikes, ...liked])];
    state.reelSaves = [...new Set([...state.reelSaves, ...saved])];
    // Save before removing the old key, so closing the app right away does not lose the reels.
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Import is best-effort; keep the old key so the next launch can retry.
    return;
  }
  await AsyncStorage.removeItem(OLD_REELS_KEY).catch(() => {});
}

export async function load(): Promise<Db> {
  if (cache) return cache;

  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(DB_KEY);
  } catch {
    raw = null;
  }

  if (raw) {
    let parsed: Db | null = null;
    try {
      parsed = normalizeDb(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (parsed) {
      cache = parsed;
      fresh = false;
      return cache;
    }
    // Unusable stored value: keep a copy before the seed replaces it, and tell the user once.
    // shortcut: a failed backup write is not retried, the reset notice still shows; retry if backups matter beyond the demo.
    await AsyncStorage.setItem(BACKUP_KEY, raw).catch(() => {});
    dataReset = true;
  }

  cache = clone(getSeed());
  fresh = true;

  // One-time migration from the previous single-user store into the founder account.
  const imported = await importOldStore();
  const founderId = Object.keys(cache.accounts)[0] ?? 'acct-founder';
  if (imported && cache.states[founderId]) {
    cache.states[founderId] = imported;
    cache.session.accountId = founderId;
  }
  if (imported) await retireOldStore(cache);
  await importOldReels(founderId);

  return cache;
}

async function writeNow(attempt: number): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(cache));
    setWriteFailed(false);
  } catch {
    if (writeTimer) return; // a newer write is already scheduled and will save the latest data
    if (attempt < WRITE_RETRIES) {
      writeTimer = setTimeout(() => {
        writeTimer = null;
        void writeNow(attempt + 1);
      }, WRITE_DEBOUNCE_MS * 2 ** (attempt + 1));
      return;
    }
    // The data stays in memory and the next scheduleWrite tries again.
    setWriteFailed(true);
  }
}

export function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void writeNow(0);
  }, WRITE_DEBOUNCE_MS);
}

/** Restore the whole database to its seed contents (kept session is reapplied by the caller). */
export function resetToSeed(): Db {
  cache = clone(getSeed());
  return cache;
}

/** A deep copy of one account's seed state, used to reset a single account. */
export function getSeedState(accountId: string): StoreState | null {
  const state = getSeed().states[accountId];
  return state ? clone(state) : null;
}

/** The seed's shared like counters (the floor a reset account's likes are removed down to). */
export function getSeedLikes(): Record<string, number> {
  return getSeed().shared.reelLikes;
}

/** The seed's demo accounts. */
export function seedAccounts(): Account[] {
  return clone(Object.values(getSeed().accounts));
}

/** Remove every cached key except the demo database and its backup. */
export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const removable = keys.filter((k) => k !== DB_KEY && k !== BACKUP_KEY);
  if (removable.length) await AsyncStorage.multiRemove(removable);
}

/** Length in characters of the stored demo database JSON, or 0 when absent. */
export async function demoDataSize(): Promise<number> {
  const raw = await AsyncStorage.getItem(DB_KEY);
  return raw ? raw.length : 0;
}
