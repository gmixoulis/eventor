import {
  clearCache as clearStorage,
  demoDataSize as demoDataSizeBytes,
  getDb,
  getSeedLikes,
  getSeedState,
  isFresh,
  load,
  onSaveFailedChange,
  resetToSeed,
  saveFailed,
  scheduleWrite,
  seedAccounts,
  wasReset,
} from '@/backend/db';
import type { Account, DeviceSettings, Meeting, StoreState } from '@/backend/types';
import { applicationsApi } from '@/backend/applications-api';
import { delay } from '@/backend/latency';
import { passportApi } from '@/backend/passport-api';
import { cancelAndPromote, reservationsApi } from '@/backend/reservations-api';
import { ticketsApi } from '@/backend/tickets-api';
import { listPeople } from '@/data';
import { eventNow } from '@/lib/event-clock';
import { aggregateStats } from '@/matching/stats';

export type { LeaderboardRow } from '@/backend/passport-api';

/** `dataReset`: stored demo data could not be read and was reset to the seed (a backup was kept). */
export type SessionInfo = { accountId: string | null; fresh: boolean; dataReset: boolean };

/** New meetings go first; a meeting already stored under the same id is replaced, never duplicated. */
function withMeeting(meetings: Meeting[], meeting: Meeting): Meeting[] {
  return [meeting, ...meetings.filter((m) => m.id !== meeting.id)];
}

/** Writes a meeting into an account's state; a meeting already there (same id) is replaced. */
async function addMeeting(accountId: string, meeting: Meeting): Promise<void> {
  await load();
  await delay();
  const state = getDb().states[accountId];
  if (!state) return;
  state.meetings = withMeeting(state.meetings, meeting);
  scheduleWrite();
}

export const api = {
  auth: {
    /** GET /auth/session */
    async current(): Promise<SessionInfo> {
      await load();
      await delay();
      return { accountId: getDb().session.accountId, fresh: isFresh(), dataReset: wasReset() };
    },
    /** POST /auth/sign-in (accountId null means "continue as guest") */
    async signIn(accountId: string | null): Promise<void> {
      await load();
      await delay();
      getDb().session.accountId = accountId;
      scheduleWrite();
    },
    /** POST /auth/sign-out */
    async signOut(): Promise<void> {
      await load();
      await delay();
      getDb().session.accountId = null;
      scheduleWrite();
    },
  },

  accounts: {
    /** GET /accounts */
    async list(): Promise<Account[]> {
      await load();
      await delay();
      return Object.values(getDb().accounts);
    },
    /** The demo accounts bundled with the app; no HTTP call, used when the session cannot load. */
    seedList(): Account[] {
      return seedAccounts();
    },
  },

  me: {
    /** GET /me */
    async get(accountId: string): Promise<StoreState | null> {
      await load();
      await delay();
      return getDb().states[accountId] ?? null;
    },
    /** PUT /me */
    async update(accountId: string, patch: Partial<StoreState>): Promise<void> {
      await load();
      await delay();
      const db = getDb();
      db.states[accountId] = { ...(db.states[accountId] ?? ({} as StoreState)), ...patch };
      scheduleWrite();
    },
    /** DELETE /me/reset (restore this account to its seed state) */
    async resetToSeed(accountId: string): Promise<void> {
      await load();
      await delay();
      const db = getDb();
      const seedState = getSeedState(accountId);
      // Give back this account's likes on the shared counters, never below the seed base.
      const kept = new Set(seedState?.reelLikes ?? []);
      const seedLikes = getSeedLikes();
      for (const id of db.states[accountId]?.reelLikes ?? []) {
        if (kept.has(id) || typeof db.shared.reelLikes[id] !== 'number') continue;
        db.shared.reelLikes[id] = Math.max(seedLikes[id] ?? 0, db.shared.reelLikes[id] - 1);
      }
      // A seed like this account removed comes back with the seed state, so its count comes back too.
      const current = new Set(db.states[accountId]?.reelLikes ?? []);
      for (const id of kept) {
        if (!current.has(id) && typeof db.shared.reelLikes[id] === 'number') db.shared.reelLikes[id] += 1;
      }
      // Give back every seat this account held (promoting the waitlist) and leave every waitlist.
      // At this account's own event clock, the moment it was looking at.
      const now = eventNow(db.states[accountId]?.settings.demoClock ?? null, new Date());
      for (const reservation of [...(db.states[accountId]?.reservations ?? [])]) {
        cancelAndPromote(accountId, reservation.key, now);
      }
      if (seedState) db.states[accountId] = seedState;
      scheduleWrite();
    },
  },

  device: {
    /** GET /device (the organizer's switches and event setup, the same for every account and visitors) */
    async get(): Promise<DeviceSettings> {
      await load();
      await delay();
      return getDb().device;
    },
    /** PUT /device */
    async update(device: DeviceSettings): Promise<void> {
      await load();
      await delay();
      getDb().device = device;
      scheduleWrite();
    },
  },

  admin: {
    /** POST /admin/reset-demo-data */
    async resetDemoData(): Promise<void> {
      await load();
      await delay();
      const accountId = getDb().session.accountId;
      resetToSeed();
      // Stay signed in to the same account, now in its seed state.
      getDb().session.accountId = accountId;
      scheduleWrite();
    },
  },

  reels: {
    /** GET /reels/like-counts */
    async counts(): Promise<Record<string, number>> {
      await load();
      await delay();
      return { ...getDb().shared.reelLikes };
    },
    /** POST /reels/:id/like (bumps the shared counter; the personal liked list lives in /me) */
    async like(id: string): Promise<number> {
      await load();
      await delay();
      const db = getDb();
      const next = (db.shared.reelLikes[id] ?? 0) + 1;
      db.shared.reelLikes[id] = next;
      scheduleWrite();
      return next;
    },
    /** DELETE /reels/:id/like */
    async unlike(id: string): Promise<number> {
      await load();
      await delay();
      const db = getDb();
      const next = Math.max(0, (db.shared.reelLikes[id] ?? 0) - 1);
      db.shared.reelLikes[id] = next;
      scheduleWrite();
      return next;
    },
  },

  storage: {
    /** DELETE /cache (never touches the demo database key) */
    async clearCache(): Promise<void> {
      await delay();
      await clearStorage();
    },
    /** True after saving to the device failed every retry. */
    saveFailed(): boolean {
      return saveFailed();
    },
    /** Called when saveFailed() changes; returns an unsubscribe function. */
    onSaveFailedChange(listener: () => void): () => void {
      return onSaveFailedChange(listener);
    },
    /** GET /cache/size (demo database size in kilobytes) */
    async demoDataSizeKb(): Promise<number> {
      await delay();
      const bytes = await demoDataSizeBytes();
      return Math.max(1, Math.round(bytes / 1024));
    },
  },

  meetings: {
    /** POST /meetings */
    async create(accountId: string, meeting: Meeting): Promise<void> {
      await addMeeting(accountId, meeting);
    },
    /**
     * GET /meetings/tables (every booked meeting except the given account's own, for table
     * assignment; the caller adds its own live meetings).
     */
    async allForTables(exceptAccountId: string | null): Promise<Meeting[]> {
      await load();
      await delay();
      return Object.entries(getDb().states)
        .filter(([id]) => id !== exceptAccountId)
        .flatMap(([, state]) => state.meetings);
    },
  },

  organizer: {
    /** POST /organizer/meeting-suggestions */
    async suggestMeeting(accountId: string, meeting: Meeting): Promise<void> {
      await addMeeting(accountId, meeting);
    },
    /** GET /organizer/matchmaking-stats */
    async stats() {
      await load();
      await delay();
      const accounts = Object.values(getDb().states).map((state) => ({
        id: state.profile.id,
        selections: state.profile.selections,
        networking: state.profile.networking,
      }));
      return aggregateStats(listPeople(), accounts);
    },
  },

  reservations: reservationsApi,
  applications: applicationsApi,
  passport: passportApi,
  tickets: ticketsApi,
};
