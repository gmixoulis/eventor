import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { fonts, radius, spacing, typeScale } from '@/constants/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
  dropdown?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
};

// The chip is 32 tall; the hit slop brings the target to 44.
const SLOP = { top: 6, bottom: 6, left: 2, right: 2 };

export function Chip({ label, selected, onPress, count, dropdown, accessibilityLabel, disabled }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={SLOP}
      // Without onPress it is a plain label (a match reason, an Ask source whose screen is switched off).
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (count ? `${label}, ${count} selected` : label)}
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled]}>
      {selected ? <MaterialCommunityIcons name="check" size={14} color={colors.bg} /> : null}
      <Text style={[styles.label, selected && styles.selectedLabel, disabled && styles.disabledLabel]}>{label}</Text>
      {dropdown ? (
        <MaterialCommunityIcons name="chevron-down" size={16} color={selected ? colors.bg : colors.textMuted} />
      ) : null}
      {count !== undefined ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  selected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  label: {
    ...typeScale.label,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  selectedLabel: {
    color: colors.bg,
  },
  disabled: { borderColor: colors.border, opacity: 0.6 },
  disabledLabel: { color: colors.textMuted },
  badge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.artRed,
    borderWidth: 1.5,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.onArt,
  },
}));
