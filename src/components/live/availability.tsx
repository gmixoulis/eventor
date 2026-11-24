import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { CountText } from '@/components/count-text';
import { StatusPill } from '@/components/live/status-pill';
import { makeStyles } from '@/components/theme';
import { CSS_EASE_OUT } from '@/constants/motion';
import { motion, radius, spacing, typeScale } from '@/constants/theme';
import { type LiveStatus } from '@/lib/live-status';

/**
 * One calm "availability" block: status and seats on one line and a thin meter.
 * A full event keeps its red pill but the meter goes neutral, so a full bar never shouts.
 * Items without a capacity, and ended items, show the status pill alone.
 */
export function Availability({ status }: { status: LiveStatus }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  // Seats no longer matter once it has ended: the pill alone says "Ended".
  if (status.capacity === null || status.phase === 'ended') return <StatusPill status={status} />;
  const capacity = status.capacity;
  const left = Math.max(0, capacity - status.taken);
  const share = Math.min(1, status.taken / Math.max(1, capacity));
  const fillTone = status.level === 'full' ? styles.full : status.level === 'filling' ? styles.filling : styles.open;
  const label = `${status.label}. ${status.taken} of ${capacity} seats taken.`;
  return (
    <View style={styles.block} accessible accessibilityLabel={label}>
      <View style={styles.head}>
        <StatusPill status={status} compact />
        {left === 0 ? (
          <Text style={styles.count}>All {capacity} seats taken</Text>
        ) : (
          <View style={styles.seats}>
            <CountText value={left} style={styles.count} />
            <Text style={styles.count}> of {capacity} seats left</Text>
          </View>
        )}
      </View>
      <View style={styles.track}>
        {/* Absolute and childless, so animating width costs no layout of siblings. */}
        <Animated.View
          style={[
            styles.fill,
            fillTone,
            {
              width: `${share * 100}%`,
              transitionProperty: 'width',
              transitionDuration: reduced ? 0 : motion.duration.enter,
              transitionTimingFunction: CSS_EASE_OUT,
            },
          ]}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    block: { gap: spacing.sm },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    seats: { flexDirection: 'row', alignItems: 'baseline' },
    track: { height: 4, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
    open: { backgroundColor: colors.success },
    filling: { backgroundColor: colors.warning },
    full: { backgroundColor: colors.textMuted },
    count: { ...typeScale.label, color: colors.text, fontVariant: ['tabular-nums'] },
  }),
);
