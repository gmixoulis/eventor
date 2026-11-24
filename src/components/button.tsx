import * as Haptics from 'expo-haptics';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

type Props = {
  label: string;
  onPress?: () => void;
  /** primary: the one main action (full width). outline and ghost: secondary, inline-sized. */
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  accessibilityLabel?: string;
};

// Outline and ghost stay 36 tall to fit inline rows; the hit slop brings the target to 44.
const COMPACT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

export function Button({ label, onPress, variant = 'primary', disabled = false, accessibilityLabel }: Props) {
  const styles = useStyles();
  const primary = variant === 'primary';
  const press = () => {
    if (primary) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <PressableScale
      onPress={press}
      disabled={disabled}
      hitSlop={primary ? undefined : COMPACT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.base, styles[variant], disabled && styles.disabled]}>
      <Text style={[styles.text, primary ? styles.primaryText : variant === 'ghost' ? styles.ghostText : styles.outlineText]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
    alignSelf: 'stretch',
    minHeight: 48,
  },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 36,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    ...typeScale.label,
  },
  primaryText: {
    fontSize: 15,
    color: colors.onPrimary,
  },
  outlineText: {
    fontSize: 13,
    color: colors.text,
  },
  ghostText: {
    fontSize: 13,
    color: colors.primary,
  },
}));
