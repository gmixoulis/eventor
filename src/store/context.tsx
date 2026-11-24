import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Alert } from 'react-native';

import { api } from '@/backend/api';
import { makeGuestState } from '@/backend/state';
import type { Account, DeviceSettings, StoreState } from '@/backend/types';
import { requireSignIn } from '@/components/auth/require-sign-in';
import { defaultEventSetup } from '@/lib/event-setup';
import { loadInitialSession, loadSession, withRestartedClock } from '@/store/hydrate';

type StoreContextValue = {
  state: StoreState;
  setState: (action: SetStateAction<StoreState>) => void;
  /** The organizer's switches and event setup: one set for the device, kept across sign-in, sign-out and account switches. */
  device: DeviceSettings;
  setDevice: (next: (device: DeviceSettings) => DeviceSettings) => void;
  accountId: string | null;
  accounts: Account[];
  firstLaunch: boolean;
  sharedLikes: Record<string, number>;
  setSharedLikes: Dispatch<SetStateAction<Record<string, number>>>;
  /** Reserved seats per agenda key, shared by every account. */
  reservedCounts: Record<string, number>;
  /** The signed-in account's waitlist positions by agenda key. */
  waitlistPositions: Record<string, number>;
  /** Re-reads both from the backend; a result for an account no longer signed in is dropped. */
  refreshReservations: () => Promise<void>;
  /** Side event id to its sub-admin's account id, the same for every account. */
  sideEventAdmins: Record<string, string>;
  setSideEventAdmins: Dispatch<SetStateAction<Record<string, string>>>;
  signIn: (accountId: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** True after saving to the device failed every retry this session. */
  saveFailed: boolean;
  accountIdRef: { readonly current: string | null };
  /** Bumped by a learning reset or an account switch; in-flight learning results are dropped. */
  learningGenRef: { current: number };
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<StoreState>(() => makeGuestState());
  const [device, setDeviceRaw] = useState<DeviceSettings>(defaultEventSetup);
  const [accountId, setAccountIdState] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sharedLikes, setSharedLikes] = useState<Record<string, number>>({});
  const [reservedCounts, setReservedCounts] = useState<Record<string, number>>({});
  const [waitlistPositions, setWaitlistPositions] = useState<Record<string, number>>({});
  const [sideEventAdmins, setSideEventAdmins] = useState<Record<string, string>>({});
  const [firstLaunch, setFirstLaunch] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dataReset, setDataReset] = useState(false);
  const [saveFailed, setSaveFailed] = useState(() => api.storage.saveFailed());
  const accountIdRef = useRef<string | null>(null);
  const learningGenRef = useRef(0);

  const setAccountId = (id: string | null) => {
    accountIdRef.current = id;
    learningGenRef.current += 1;
    setAccountIdState(id);
  };

  useEffect(() => {
    let cancelled = false;
    void loadInitialSession().then((initial) => {
      if (cancelled) return;
      setAccounts(initial.accounts);
      setFirstLaunch(initial.firstLaunch);
      setAccountId(initial.accountId);
      setStateRaw(initial.state);
      setDeviceRaw(initial.device);
      setSharedLikes(initial.sharedLikes);
      setReservedCounts(initial.reservedCounts);
      setWaitlistPositions(initial.waitlistPositions);
      setSideEventAdmins(initial.sideEventAdmins);
      setDataReset(initial.dataReset);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => api.storage.onSaveFailedChange(() => setSaveFailed(api.storage.saveFailed())),
    [],
  );

  // The one place that tells the user about storage problems, each at most once per session.
  const toldReset = useRef(false);
  useEffect(() => {
    if (!hydrated || !dataReset || toldReset.current) return;
    toldReset.current = true;
    Alert.alert('Demo data', 'Saved demo data could not be loaded, so the app started from the default demo data.');
  }, [hydrated, dataReset]);

  const toldSaveFailed = useRef(false);
  useEffect(() => {
    if (!saveFailed || toldSaveFailed.current) return;
    toldSaveFailed.current = true;
    Alert.alert('Not saved', 'Could not save your changes on this device.');
  }, [saveFailed]);

  useEffect(() => {
    if (!hydrated || !accountId) return;
    void api.me.update(accountId, state);
  }, [state, accountId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void api.device.update(device);
  }, [device, hydrated]);

  // Guest mutators become no-ops that ask the user to sign in.
  const setState = (action: SetStateAction<StoreState>) => {
    if (accountIdRef.current === null) {
      requireSignIn();
      return;
    }
    setStateRaw(action);
  };

  const setDevice = (next: (device: DeviceSettings) => DeviceSettings) => {
    if (accountIdRef.current === null) {
      requireSignIn();
      return;
    }
    setDeviceRaw(next);
  };

  const refreshReservations = async (): Promise<void> => {
    const id = accountIdRef.current;
    try {
      const [counts, positions] = await Promise.all([
        api.reservations.counts(),
        id ? api.reservations.positions(id) : {},
      ]);
      if (accountIdRef.current !== id) return;
      setReservedCounts(counts);
      setWaitlistPositions(positions);
    } catch {
      // Display-only counters: keep the last known values.
    }
  };

  const signIn = async (id: string | null) => {
    await api.auth.signIn(id);
    setFirstLaunch(false);
    if (id) {
      const s = await api.me.get(id);
      setAccountId(id);
      setStateRaw(s ? withRestartedClock(s) : makeGuestState());
    } else {
      setAccountId(null);
      setStateRaw(makeGuestState());
    }
    await refreshReservations();
  };

  const signOut = async () => {
    await api.auth.signOut();
    setAccountId(null);
    setStateRaw(makeGuestState());
    setWaitlistPositions({});
    await refreshReservations();
  };

  const deleteAccount = async () => {
    const id = accountIdRef.current;
    if (!id) return;
    await api.me.resetToSeed(id);
    await api.auth.signOut();
    setAccountId(null);
    setStateRaw(makeGuestState());
    setSharedLikes(await api.reels.counts());
    await refreshReservations();
  };

  const resetDemoData = async () => {
    await api.admin.resetDemoData();
    const session = await loadSession();
    setAccounts(session.accounts);
    setFirstLaunch(false);
    setAccountId(session.accountId);
    setStateRaw(session.state);
    setDeviceRaw(session.device);
    setSharedLikes(session.sharedLikes);
    setReservedCounts(session.reservedCounts);
    setWaitlistPositions(session.waitlistPositions);
    setSideEventAdmins(session.sideEventAdmins);
  };

  if (!hydrated) return null;

  const value: StoreContextValue = {
    state,
    setState,
    device,
    setDevice,
    accountId,
    accounts,
    firstLaunch,
    sharedLikes,
    setSharedLikes,
    reservedCounts,
    waitlistPositions,
    refreshReservations,
    sideEventAdmins,
    setSideEventAdmins,
    signIn,
    signOut,
    resetDemoData,
    deleteAccount,
    saveFailed,
    accountIdRef,
    learningGenRef,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStoreValue(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('Store hooks must be used within StoreProvider');
  return ctx;
}
