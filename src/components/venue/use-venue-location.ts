import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { ACCURACY_LEVELS, initialLocationState, locationReducer, NO_FIX_AFTER_MS, STALE_AFTER_MS } from '@/components/venue/location-state';

export type LocationStatus = 'unknown' | 'undetermined' | 'denied' | 'servicesOff' | 'granted';

// Remembered for the app session only: once declined, the accuracy dialog is never shown again on its own.
let accuracyDeclinedThisSession = false;

/**
 * Foreground location only, watched while the map screen is focused; stops on blur and unmount.
 * The automatic watch never shows Android's "Location Accuracy" dialog; only improveAccuracy() may.
 */
export function useVenueLocation() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [state, dispatch] = useReducer(locationReducer, accuracyDeclinedThisSession, initialLocationState);
  const [heading, setHeading] = useState<number>();
  const granted = permission?.granted ?? false;
  const servicesOn = state.services === 'on';

  useEffect(() => {
    if (permission) dispatch({ type: 'permission', granted: permission.granted, canAskAgain: permission.canAskAgain });
  }, [permission]);

  // Services check and the last known position, once per focus.
  useFocusEffect(() => {
    if (!granted) return;
    let cancelled = false;
    void (async () => {
      const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (cancelled) return;
      dispatch({ type: 'services', enabled });
      if (!enabled) return;
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (cancelled || !last) return;
      const age = Date.now() - last.timestamp;
      dispatch({ type: 'fix', live: false, fix: { lngLat: [last.coords.longitude, last.coords.latitude], accuracy: last.coords.accuracy,
        timestamp: last.timestamp, ageMinutes: age > STALE_AFTER_MS ? Math.round(age / 60000) : undefined } });
    })();
    return () => { cancelled = true; };
  });

  // The watch at the current accuracy level; a failure or 15 s without a fix steps down a level.
  useFocusEffect(() => {
    if (!granted || !servicesOn) return;
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;
    const timer = setTimeout(() => dispatch({ type: 'timeout' }), NO_FIX_AFTER_MS);
    Location.watchPositionAsync(
      // mayShowUserSettingsDialog (Android): never pop the system accuracy dialog from the automatic watch.
      // timeInterval is Android only; iOS filters by distance alone.
      { accuracy: ACCURACY_LEVELS[state.level], timeInterval: 1500, distanceInterval: 2, mayShowUserSettingsDialog: false },
      ({ coords, timestamp }) => {
        clearTimeout(timer);
        dispatch({ type: 'fix', live: true, fix: { lngLat: [coords.longitude, coords.latitude], accuracy: coords.accuracy, timestamp } });
      })
      .then((watch) => { if (cancelled) watch.remove(); else subscription = watch; })
      .catch(() => { clearTimeout(timer); if (!cancelled) dispatch({ type: 'watchFailed' }); });
    return () => { cancelled = true; clearTimeout(timer); subscription?.remove(); };
  });

  // Compass heading is optional: devices without a magnetometer just show the puck without a cone.
  useFocusEffect(() => {
    if (!granted) return;
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;
    Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
      const next = Math.round((trueHeading >= 0 ? trueHeading : magHeading) / 5) * 5;
      setHeading((previous) => previous === next ? previous : next);
    }).then((watch) => { if (cancelled) watch.remove(); else subscription = watch; }, () => setHeading(undefined));
    return () => { cancelled = true; subscription?.remove(); };
  });

  const status: LocationStatus = state.permission === 'unknown' ? 'unknown' : state.permission !== 'granted' ? state.permission
    : state.services === 'off' ? 'servicesOff' : 'granted';

  return {
    status, phase: state.phase, accuracyDeclined: state.accuracyDeclined, requestPermission,
    openSettings: () => void Linking.openSettings(),
    /** Android only: the one place allowed to show the system "Location Accuracy" dialog, once per tap. */
    improveAccuracy: Platform.OS === 'android' ? async () => {
      try {
        await Location.enableNetworkProviderAsync();
        dispatch({ type: 'accuracyResult', enabled: true });
      } catch {
        accuracyDeclinedThisSession = true;
        dispatch({ type: 'accuracyResult', enabled: false });
      }
    } : undefined,
    fix: granted ? state.fix : undefined,
    heading: granted ? heading : undefined,
  };
}
