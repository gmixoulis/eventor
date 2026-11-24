import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { fullName } from '@/lib/format';
import { useProfile } from '@/store';

// Icon buttons dim while pressed; each sits in a 44 x 44 pt target that keeps the original icon centre.
const pressedDim = ({ pressed }: { pressed: boolean }) => (pressed ? { opacity: 0.5 } : null);

type Props = {
  title: string;
  variant: 'tab' | 'stack';
};

export function ScreenHeader({ title, variant }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const name = fullName(profile);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {variant === 'tab' ? (
            <Pressable
              onPress={() => router.push('/search')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={({ pressed }) => [styles.iconButton, pressedDim({ pressed })]}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.iconButton, pressedDim({ pressed })]}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </Pressable>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>

        <View style={styles.side}>
          {variant === 'tab' ? (
            <Pressable
              onPress={() => router.push('/account')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Account"
              style={({ pressed }) => [styles.iconButton, pressedDim({ pressed })]}>
              <Avatar name={name} size={28} shape="circle" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  side: {
    width: 44,
    marginHorizontal: -6,
    alignItems: 'center',
  },
  // 44 x 44 pt target while the -6 margin keeps the original 32 pt layout allocation and icon centre.
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: {
    ...typeScale.header,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
}));
