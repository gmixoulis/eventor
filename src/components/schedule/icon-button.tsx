import { FontAwesome5 } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { makeStyles, useTheme } from '@/components/theme';
import { radius, typeScale } from '@/constants/theme';

type IconName = ComponentProps<typeof FontAwesome5>['name'];

/** Square outlined icon button of the schedule header, with an optional count badge. */
export function IconButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  badge?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={styles.iconButton}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <FontAwesome5 name={icon} size={13} color={colors.text} />
      {badge !== undefined && badge > 0 ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.artRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    ...typeScale.caption,
    color: colors.onArt,
    fontSize: 9,
    lineHeight: 10,
  },
}));
