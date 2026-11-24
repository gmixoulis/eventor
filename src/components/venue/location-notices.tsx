import { Text, View } from 'react-native';

import { MapPill, PillRow, useMapPillStyles } from '@/components/venue/map-pill';
import type { LocationStatus } from '@/components/venue/use-venue-location';

/** No GPS fix yet: offer better accuracy (when available) or setting the position by hand. */
export function NoFixActions({ improveAccuracy, onSetManually }: { improveAccuracy?: () => Promise<void>; onSetManually: () => void }) {
  return <PillRow>
    {improveAccuracy ? <MapPill label="Improve accuracy" onPress={() => void improveAccuracy()} /> : null}
    <MapPill label="Set my position manually" onPress={onSetManually} />
  </PillRow>;
}

export function PickingNotice({ onCancel }: { onCancel: () => void }) {
  const styles = useMapPillStyles();
  return <View style={styles.notice}>
    <Text style={styles.label}>Long-press the map where you are</Text>
    <MapPill label="Cancel" accessibilityLabel="Cancel setting position" onPress={onCancel} />
  </View>;
}

export function GpsBackNotice({ onSwitchBack, onKeep }: { onSwitchBack: () => void; onKeep: () => void }) {
  const styles = useMapPillStyles();
  return <View accessibilityLiveRegion="polite" style={styles.notice}>
    <Text style={styles.label}>GPS is accurate again. Switch back?</Text>
    <PillRow>
      <MapPill label="Switch back" accessibilityLabel="Switch back to GPS" active onPress={onSwitchBack} />
      <MapPill label="Keep mine" accessibilityLabel="Keep the position I set" onPress={onKeep} />
    </PillRow>
  </View>;
}

/** Location is not granted yet, or turned off: explain and offer the next step once. */
export function PermissionNotice({ status, onAllow, onOpenSettings, onDismiss }: {
  status: Exclude<LocationStatus, 'granted' | 'unknown'>; onAllow: () => void; onOpenSettings: () => void; onDismiss: () => void;
}) {
  const styles = useMapPillStyles();
  const ask = status === 'undetermined';
  return <View style={styles.notice}>
    <Text style={styles.label}>{ask ? 'Show where you are?' : status === 'servicesOff' ? 'Location services are off' : 'Location access is off'}</Text>
    <Text style={styles.caption}>{ask
      ? 'Your location is used only while the map is open, to show your position and start directions from where you stand. It is approximate indoors.'
      : status === 'servicesOff' ? 'Turn on location services in Settings to see your position. The map works without it.'
        : 'Allow location for this app in Settings to see your position. The map works without it.'}</Text>
    <PillRow>
      <MapPill label={ask ? 'Allow location' : 'Open settings'} active onPress={ask ? onAllow : onOpenSettings} />
      <MapPill label="Not now" onPress={onDismiss} />
    </PillRow>
  </View>;
}
