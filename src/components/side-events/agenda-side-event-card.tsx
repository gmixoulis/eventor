import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/live/status-pill';
import { Pill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { SideEvent } from '@/data';
import { formatTime } from '@/lib/format';
import type { LiveStatus } from '@/lib/live-status';

// RN draws dashed borders only on all four sides on iOS, so the dashed bar is segments.
const DASHES = Array.from({ length: 8 }, (_, i) => i);

/** A side event inside the schedule agenda: dashed bar, category tag, opens its detail. */
export function AgendaSideEventCard({ event, status, heldTag, use24h, onPress }: {
  event: SideEvent; status: LiveStatus; heldTag: string | null; use24h: boolean; onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`Side event, ${event.title}`} style={styles.card}>
      <View style={styles.bar}>
        {DASHES.map((i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.metaText}>Side event · {event.category}</Text>
        <View style={styles.meta}>
          <FontAwesome5 name="clock" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatTime(event.startTime, use24h)} - {formatTime(event.endTime, use24h)}
          </Text>
        </View>
        <View style={styles.meta}>
          <FontAwesome5 name="map-marker-alt" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {event.venueName}, {event.area}
          </Text>
        </View>
        <View style={styles.tags}>
          <StatusPill status={status} compact />
          {heldTag ? <Pill tone="neutral" label={heldTag} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    bar: { width: 4, paddingVertical: 2, justifyContent: 'space-between' },
    dash: { flex: 1, marginVertical: 2, backgroundColor: colors.sideEventBorder, borderRadius: 1 },
    body: { flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.lg - 4, paddingRight: spacing.lg, gap: spacing.xs },
    title: { ...typeScale.label, fontSize: 15, lineHeight: 20, color: colors.text },
    meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    metaText: { ...typeScale.caption, color: colors.textMuted, flexShrink: 1 },
    tags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  }),
);
