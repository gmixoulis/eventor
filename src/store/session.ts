import type { SetStateAction } from 'react';

import { api } from '@/backend/api';
import type { DeviceSettings, Profile, Settings, StoreState } from '@/backend/types';
import { getEvent } from '@/data';
import { mergeFeatures, withFeature, type FeatureId } from '@/lib/features';
import { useStoreValue } from '@/store/context';

export function useStore(): { state: StoreState; setState: (action: SetStateAction<StoreState>) => void } {
  const { state, setState } = useStoreValue();
  return { state, setState };
}

export function useSession() {
  const {
    accountId,
    accounts,
    signIn,
    signOut,
    resetDemoData,
    deleteAccount,
    firstLaunch,
    saveFailed,
  } = useStoreValue();
  const account = accountId ? accounts.find((a) => a.id === accountId) ?? null : null;
  return {
    account,
    isGuest: !accountId,
    accounts,
    signIn,
    signOut,
    resetDemoData,
    deleteAccount,
    firstLaunch,
    saveFailed,
  };
}

export function useProfile() {
  const { state, setState } = useStoreValue();
  return {
    profile: state.profile,
    updateProfile: (patch: Partial<Profile>) =>
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
  };
}

export function useSettings() {
  const { state, setState } = useStoreValue();
  return {
    cacheEnabled: state.settings.cacheEnabled,
    notifications: state.settings.notifications,
    use24h: state.settings.use24h,
    appearance: state.settings.appearance,
    set: (patch: Partial<Settings>) =>
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    clearCache: () => api.storage.clearCache(),
  };
}

/** The organizer's switches and event setup, saved for the whole device: every account and visitors read the same ones. */
export function useDeviceSettings() {
  const { device, setDevice } = useStoreValue();
  return { device, setDevice };
}

/** The merged feature switches (defaults, saved overrides, parent off turns child off) and their setters. */
export function useFeatures() {
  const { device, setDevice } = useStoreValue();
  const setFeatures = (next: (features: DeviceSettings['features']) => DeviceSettings['features']) =>
    setDevice((d) => ({ ...d, features: next(d.features) }));
  return {
    flags: mergeFeatures(device.features),
    setFeature: (id: FeatureId, on: boolean) => setFeatures((features) => withFeature(features, id, on)),
    resetFeatures: () => setFeatures(() => ({})),
  };
}

/** The event's name: the one set in the event setup form, else `fallback` (the festival's full name). */
export function useEventName(fallback: string = getEvent().name): string {
  const { device } = useStoreValue();
  return device.event?.name ?? fallback;
}
