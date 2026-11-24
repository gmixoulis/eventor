import { FontAwesome5 } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';

type IconName = ComponentProps<typeof FontAwesome5>['name'];

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  layout?: 'row' | 'column';
  accessibilityLabel?: string;
};

export function Tile({ icon, label, onPress, layout = 'row', accessibilityLabel }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.tile, layout === 'column' ? styles.column : styles.row]}>
      <View style={styles.iconWrap}>
        <FontAwesome5 name={icon} solid size={16} color={colors.text} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** A flat entry with no card chrome: a grid of these reads as a list, not a wall of cards. */
const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  tile: {
    alignItems: 'center',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  column: {
    height: 84,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 22,
    alignItems: 'center',
  },
  label: {
    ...typeScale.label,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    flexShrink: 1,
  },
}));
