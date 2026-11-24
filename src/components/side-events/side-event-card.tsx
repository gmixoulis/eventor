import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/live/status-pill';
import { PressableScale } from '@/components/pressable-scale';
import { venueWalkMinutes, walkText } from '@/components/side-events/hub-math';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { SideEvent } from '@/data';
import { formatTime } from '@/lib/format';
import type { LiveStatus } from '@/lib/live-status';

type Props = {
  event: SideEvent;
  status: LiveStatus;
  saved: boolean;
  use24h: boolean;
  onToggle: () => void;
  onPress: () => void;
};

/** A side event as a plain row of the hub list: when, what, where, how far, how full, and a save star. */
export function SideEventCard({ event, status, saved, use24h, onToggle, onPress }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };
  return (
    <PressableScale onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${formatTime(event.startTime, use24h)} to ${formatTime(event.endTime, use24h)}, ${event.venueName}, ${walkText(event.lat, event.lng)}`}
      style={styles.card}>
      {/* Time and walk lead the card so the list scans by when and how far. */}
      <View style={styles.when}>
        <Text style={styles.start}>{formatTime(event.startTime, use24h)}</Text>
        <Text style={styles.caption}>{formatTime(event.endTime, use24h)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>
          {event.venueName}, {event.area} · {event.host}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.caption}>{venueWalkMinutes(event.lat, event.lng)} min walk</Text>
          <StatusPill status={status} />
        </View>
      </View>
      <PressableScale
        onPress={toggle}
        style={styles.star}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from my agenda' : 'Add to my agenda'}
        accessibilityState={{ selected: saved }}>
        <FontAwesome5 name="star" solid={saved} size={18} color={saved ? colors.primary : colors.textMuted} />
      </PressableScale>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
    },
    when: { width: 64, paddingVertical: spacing.md, gap: 2 },
    start: { ...typeScale.label, color: colors.text, fontVariant: ['tabular-nums'] },
    body: { flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.sm, gap: spacing.xs },
    title: { ...typeScale.label, color: colors.text },
    caption: { ...typeScale.caption, color: colors.textMuted, flexShrink: 1 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  }),
);
