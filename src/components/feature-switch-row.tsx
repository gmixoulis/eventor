import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { featureLabel, type Feature, type FeatureFlags, type FeatureId } from '@/lib/features';

/** One feature switch as a plain row; a child whose parent is off is greyed with "Needs <parent>". */
export function FeatureSwitchRow({ feature, flags, onChange }: {
  feature: Feature;
  flags: FeatureFlags;
  onChange: (id: FeatureId, on: boolean) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const parentOff = feature.dependsOn.find((parent) => !flags[parent]);
  const needs = parentOff ? `Needs ${featureLabel(parentOff)}` : null;
  const on = flags[feature.id];
  return (
    <Pressable
      onPress={() => onChange(feature.id, !on)}
      disabled={!!needs}
      accessibilityRole="switch"
      accessibilityLabel={needs ? `${feature.label}, ${needs}` : feature.label}
      accessibilityState={{ checked: on, disabled: !!needs }}
      style={[styles.row, feature.dependsOn.length > 0 && styles.child]}>
      <View style={styles.grow}>
        <Text style={[styles.label, needs && styles.muted]}>{feature.label}</Text>
        {needs ? <Text style={styles.caption}>{needs}</Text> : null}
      </View>
      {/* The row carries the switch role and state for screen readers. */}
      <Switch
        value={on}
        disabled={!!needs}
        onValueChange={(value) => onChange(feature.id, value)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.switchThumb}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  // A child sits indented under its parent, as in the plan's table.
  child: { paddingLeft: spacing.lg + spacing.xl },
  grow: { flex: 1 },
  label: { ...typeScale.label, color: colors.text },
  muted: { color: colors.textMuted },
  caption: { ...typeScale.caption, color: colors.textMuted },
}));
