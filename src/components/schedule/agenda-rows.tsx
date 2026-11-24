import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

/** Time heading of an agenda section, with its Now/Next tag and session count. */
export function AgendaSectionHeader({ title, count, current, noun }: {
  title: string; count: number; current?: 'now' | 'next'; noun: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{title}</Text>
        {current ? <Pill tone="neutral" label={current === 'now' ? 'Now' : 'Next'} /> : null}
      </View>
      <Text style={styles.headerCount}>
        {count} {count === 1 ? noun : `${noun}s`}
      </Text>
    </View>
  );
}

/** A one-line row for an all-day session; side events open their website. */
export function AllDayRow({ title, external, onPress }: { title: string; external: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={styles.allDayRow}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <Text style={styles.allDayTitle} numberOfLines={1}>
        {title}
      </Text>
      {external ? (
        <FontAwesome5 name="external-link-alt" size={12} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

/** Floating pill that scrolls the agenda back to the current section. */
export function JumpToNowButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.jumpWrap}>
      <PressableScale onPress={onPress} hitSlop={4} style={styles.jumpButton} accessibilityRole="button" accessibilityLabel="Jump to now">
        <FontAwesome5 name="clock" size={12} color={colors.onPrimary} />
        <Text style={styles.jumpText}>Jump to now</Text>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typeScale.section,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  headerCount: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  allDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  jumpWrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  jumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  jumpText: {
    ...typeScale.label,
    fontSize: 12,
    color: colors.onPrimary,
  },
  allDayTitle: {
    ...typeScale.label,
    color: colors.text,
    flexShrink: 1,
  },
}));
