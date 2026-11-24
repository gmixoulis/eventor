import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';
import type { SideEvent } from '@/data';

/** React Native's Linking docs: geo: on Android, an Apple Maps https link on iOS. */
function mapsUrl(event: Pick<SideEvent, 'lat' | 'lng' | 'venueName'>, os: string): string {
  const ll = `${event.lat},${event.lng}`;
  const q = encodeURIComponent(event.venueName);
  return os === 'android' ? `geo:${ll}?q=${ll}(${q})` : `https://maps.apple.com/?ll=${ll}&q=${q}`;
}

async function openMaps(event: SideEvent) {
  try {
    await Linking.openURL(mapsUrl(event, Platform.OS));
  } catch {
    // No maps app took the geo: link; the web map opens in any browser.
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`).catch(() =>
      Alert.alert('Unable to open maps', 'Please try again.'),
    );
  }
}

export function PlaceLinks({ event }: { event: SideEvent }) {
  const styles = useStyles();
  const url = event.url;
  return (
    <View style={styles.links}>
      <Button label="Open in maps" variant="outline" onPress={() => void openMaps(event)} />
      {url ? (
        <Button
          label="Event page"
          variant="outline"
          onPress={() => void WebBrowser.openBrowserAsync(url).catch(() => Alert.alert('Unable to open link', 'Please try again.'))}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  }),
);
