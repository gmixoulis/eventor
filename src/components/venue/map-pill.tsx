import { FontAwesome5 } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityState } from 'react-native';

import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

/** Rounded floating button of the venue map: filters, notices, list toggle and walk controls. */
export function MapPill({ label, onPress, icon, iconSize = 12, active = false, accessibilityLabel, accessibilityState }: {
  label: string; onPress: () => void; icon?: string; iconSize?: number; active?: boolean;
  accessibilityLabel?: string; accessibilityState?: AccessibilityState;
}) {
  const styles = useMapPillStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={accessibilityState}
    onPress={onPress} style={[styles.pill, active && styles.activePill]}>
    {icon ? <FontAwesome5 name={icon} size={iconSize} color={active ? colors.card : colors.text} /> : null}
    <Text style={[styles.label, active && styles.activeText]}>{label}</Text>
  </Pressable>;
}

/** A row of pills. */
export function PillRow({ children }: { children: ReactNode }) {
  const styles = useMapPillStyles();
  return <View style={styles.row}>{children}</View>;
}

export const useMapPillStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  pill: { minHeight: 36, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.card,
    ...shadow.card },
  activePill: { backgroundColor: colors.primary },
  activeText: { color: colors.card },
  label: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  notice: { ...typeScale.caption, color: colors.text, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.card, ...shadow.card, marginRight: 56 },
}));
