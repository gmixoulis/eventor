import { api } from '@/backend/api';
import { makeGuestState } from '@/backend/state';
import type { Account, DeviceSettings, StoreState } from '@/backend/types';
import { restartDemoClock } from '@/lib/event-clock';
import { defaultEventSetup } from '@/lib/event-setup';

export type InitialSession = {
  accountId: string | null;
  state: StoreState;
  /** The organizer's switches and event setup, the same whoever is signed in. */
  device: DeviceSettings;
  accounts: Account[];
  firstLaunch: boolean;
  sharedLikes: Record<string, number>;
  /** Reserved seats per agenda key, shared by every account. */
  reservedCounts: Record<string, number>;
  /** The signed-in account's waitlist positions by agenda key. */
  waitlistPositions: Record<string, number>;
  /** Side event id to its sub-admin's account id. */
  sideEventAdmins: Record<string, string>;
  /** Stored data could not be used; the user is told once. */
  dataReset: boolean;
};

/** A loaded account state with its preset demo clock restarted at the anchor (saved by the store). */
export function withRestartedClock(state: StoreState, realNow = new Date()): StoreState {
  const demoClock = restartDemoClock(state.settings.demoClock, realNow);
  return demoClock === state.settings.demoClock ? state : { ...state, settings: { ...state.settings, demoClock } };
}

/** The current session, its account's state, the accounts and the shared counters. */
export async function loadSession(): Promise<InitialSession> {
  // The first call loads the database; the rest read it, so they can run together.
  const info = await api.auth.current();
  const [accounts, state, device, sharedLikes, reservedCounts, waitlistPositions, sideEventAdmins] = await Promise.all([
    api.accounts.list(),
    info.accountId ? api.me.get(info.accountId) : null,
    api.device.get(),
    api.reels.counts(),
    api.reservations.counts(),
    info.accountId ? api.reservations.positions(info.accountId) : {},
    api.applications.admins(),
  ]);
  return {
    accountId: info.accountId,
    state: state ? withRestartedClock(state) : makeGuestState(),
    device,
    accounts,
    firstLaunch: info.fresh && info.accountId === null,
    sharedLikes,
    reservedCounts,
    waitlistPositions,
    sideEventAdmins,
    dataReset: info.dataReset,
  };
}

/**
 * Everything the store needs at launch. Never rejects: if loading fails the app opens as a
 * guest with the bundled demo accounts and reports a data reset, instead of a blank screen.
 */
export async function loadInitialSession(): Promise<InitialSession> {
  try {
    return await loadSession();
  } catch {
    return {
      accountId: null,
      state: makeGuestState(),
      device: defaultEventSetup(),
      accounts: api.accounts.seedList(),
      firstLaunch: false,
      sharedLikes: {},
      reservedCounts: {},
      waitlistPositions: {},
      sideEventAdmins: {},
      dataReset: true,
    };
  }
}
