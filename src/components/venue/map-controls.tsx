import { FontAwesome5 } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

/** The right-hand control column shared by the schematic and the real map. */
export function MapControls({ routing, children }: { routing: boolean; children: ReactNode }) {
  const styles = useStyles();
  return (
    <ScrollView style={[styles.controls, routing && styles.routingControls]} contentContainerStyle={styles.controlContent}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/** 2D / 3D segment. `label` gives each option's accessibility label. */
export function ViewModeToggle({ is3D, onChange, label }: {
  is3D: boolean; onChange: (raised: boolean) => void; label: (raised: boolean) => string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segment}>
      {[false, true].map((raised) => <Pressable key={String(raised)} accessibilityRole="button"
        accessibilityLabel={label(raised)} accessibilityState={{ selected: is3D === raised }}
        onPress={() => onChange(raised)} style={[styles.control, raised === is3D && styles.active]}>
        <Text style={[styles.controlText, raised === is3D && styles.activeText]}>{raised ? '3D' : '2D'}</Text>
      </Pressable>)}
    </View>
  );
}

export function MapControlButton({ icon, label, onPress, rotate }: { icon: string; label: string; onPress: () => void; rotate?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={4} onPress={onPress} style={styles.control}>
    <View style={rotate === undefined ? undefined : { transform: [{ rotate: `${rotate}deg` }] }}>
      <FontAwesome5 name={icon} size={15} color={colors.text} />
    </View>
  </Pressable>;
}

/** Bottom-left legend card shown while no route is drawn. */
export function MapLegend({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View pointerEvents="none" style={styles.legend}>
      <Text style={styles.legendTitle}>{title}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  controls: { position: 'absolute', right: spacing.md, top: 120, bottom: spacing.lg, width: 44 },
  routingControls: { top: 72 },
  controlContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  control: { width: 44, height: 44, backgroundColor: colors.card, borderRadius: radius.sm,
    justifyContent: 'center', alignItems: 'center', ...shadow.card },
  segment: { borderRadius: radius.sm, backgroundColor: colors.card, ...shadow.card },
  active: { backgroundColor: colors.primary },
  controlText: { ...typeScale.label, color: colors.text },
  activeText: { color: colors.onPrimary },
  legend: { position: 'absolute', left: spacing.lg, bottom: 80, gap: spacing.xs, padding: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.card },
  legendTitle: { ...typeScale.section, color: colors.text },
}));
