import { FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';

import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { formatPosition, positionReadout, type Position } from '@/components/venue/position';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { Place } from '@/data/types';
import { formatTime } from '@/lib/format';
import { useSettings } from '@/store';

const SOURCE_NAME = { gps: 'GPS', manual: 'set by you', checkpoint: 'checkpoint', simulated: 'simulated, demo only' } as const;

export function LocationReadout({ position, gpsOn, noFix, onPress }: { position?: Position; gpsOn: boolean; noFix?: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { text, low, simulated } = positionReadout(position, gpsOn, noFix);
  const set = position?.source === 'manual' || position?.source === 'checkpoint';
  return <Pressable accessibilityRole="button" accessibilityLiveRegion="polite"
    accessibilityLabel={`${position ? `Position source: ${SOURCE_NAME[position.source]}. ` : ''}${text}. Open position options`}
    onPress={onPress} style={[styles.readout, (low || simulated) && styles.low]}>
    {simulated ? <Text style={styles.tag}>Simulated</Text> : null}
    <FontAwesome5 name={set ? 'map-pin' : low ? 'exclamation-triangle' : 'crosshairs'} size={12} color={low ? colors.warning : colors.primary} />
    <Text style={[styles.text, low && styles.lowText]}>{text}</Text>
  </Pressable>;
}

type SheetProps = {
  startChoosing?: boolean; position?: Position; places: Place[]; gpsOn: boolean; overridden: boolean; simulated: boolean;
  onSetPlace: (place: Place) => void; onPickOnMap?: () => void; onUseGps: () => void; onScan: () => void;
  /** Demo simulation, offered only where the real map can show it. */
  onSimulate?: (on: boolean) => void; onClose: () => void;
};

export function PositionSheet({ startChoosing = false, position, places, gpsOn, overridden, simulated, onSetPlace, onPickOnMap, onUseGps, onScan, onSimulate, onClose }: SheetProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [choosing, setChoosing] = useState(startChoosing);
  const [copied, setCopied] = useState(false);
  const { use24h } = useSettings();
  const copy = async (fix: Position) => {
    await Clipboard.setStringAsync(formatPosition(fix));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const rows: [string, string][] = position ? [
    ['Source', SOURCE_NAME[position.source]],
    ['Latitude', position.lngLat[1].toFixed(5)],
    ['Longitude', position.lngLat[0].toFixed(5)],
    ['Accuracy', position.accuracy === null ? 'Not measured' : `About ${Math.round(position.accuracy)} m`],
    ['Fix taken', formatTime(new Date(position.timestamp), use24h)],
  ] : [];
  return <Sheet visible title="Your position" onClose={onClose} headerRight={<>
    {simulated ? <Text style={styles.tag}>Simulated</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Close position options" onPress={onClose} style={styles.close}>
      <FontAwesome5 name="times" size={16} color={colors.text} />
    </Pressable>
  </>}>
        <ScrollView style={{ maxHeight: height * 0.7 }} contentContainerStyle={styles.content}>
          {rows.length ? rows.map(([label, value]) => <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={styles.row}>
            <Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text>
          </View>) : <Text style={styles.text}>{gpsOn ? 'Finding your location.' : 'Location is off. You can still set your position below.'}</Text>}
          {position ? <View accessibilityLiveRegion="polite">
            <SheetButton icon={copied ? 'check' : 'copy'} label={copied ? 'Copied' : 'Copy'}
              accessibilityLabel={copied ? 'Coordinates copied' : 'Copy coordinates'} onPress={() => void copy(position)} />
          </View> : null}
          <Text accessibilityRole="header" style={styles.group}>I am here</Text>
          {choosing ? <>
            <Text style={styles.text}>Tap the place you are at{onPickOnMap ? ', or long-press a point on the map' : ''}.</Text>
            {places.map((place) => <SheetButton key={place.id} icon="map-marker-alt" label={place.name} accessibilityLabel={`I am at ${place.name}`}
              onPress={() => onSetPlace(place)} />)}
            {onPickOnMap ? <SheetButton icon="hand-pointer" label="Long-press on the map" onPress={onPickOnMap} /> : null}
          </> : <SheetButton icon="map-pin" label="Set my position manually" onPress={() => setChoosing(true)} />}
          <SheetButton icon="qrcode" label="Scan a checkpoint" onPress={onScan} />
          {overridden ? <SheetButton icon="crosshairs" label="Use GPS again" onPress={onUseGps} /> : null}
{onSimulate ? <>
          <Text accessibilityRole="header" style={styles.group}>Demo</Text>
          <View style={styles.switchRow}>
            <Text style={[styles.text, styles.flex]}>Simulate my location at the venue</Text>
            <Switch accessibilityLabel="Simulate my location at the venue" value={simulated} onValueChange={onSimulate}
              trackColor={{ true: colors.warning, false: colors.borderStrong }} />
          </View>
          <Text style={styles.caption}>For presentations. Places you at the main entrance with 6 m accuracy and ignores real GPS. Off when the app restarts.</Text>
          </> : null}
        </ScrollView>
  </Sheet>;
}

function SheetButton({ icon, label, onPress, accessibilityLabel }: { icon: string; label: string; onPress: () => void; accessibilityLabel?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={styles.button}>
    <FontAwesome5 name={icon} size={14} color={colors.primary} />
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  readout: { alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow.card, maxWidth: '85%' },
  low: { backgroundColor: colors.warningSoft },
  tag: { ...typeScale.overline, color: colors.card, backgroundColor: colors.warning, paddingHorizontal: spacing.sm,
    paddingVertical: 2, borderRadius: radius.xs, overflow: 'hidden' },
  text: { ...typeScale.caption, color: colors.text, flexShrink: 1 },
  lowText: { color: colors.warning },
  caption: { ...typeScale.caption, color: colors.textMuted },
  flex: { flex: 1 },
  content: { gap: spacing.sm },
  group: { ...typeScale.overline, color: colors.textMuted, marginTop: spacing.md },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { ...typeScale.label, color: colors.textMuted },
  value: { ...typeScale.mono, fontSize: 14, color: colors.text },
  button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  buttonText: { ...typeScale.label, color: colors.primary },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
