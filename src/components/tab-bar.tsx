import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeTabFor, hidesTabBar, tabPath, tabSwitch, tabsForMode, type TabIconName, type TabSpec } from '@/components/tabs';
import { makeStyles, useTheme } from '@/components/theme';
import { useKeyboardOpen } from '@/components/use-keyboard-open';
import { EASE_OUT } from '@/constants/motion';
import { fonts, motion, radius, spacing, typeScale } from '@/constants/theme';
import { useFeatures, useSession } from '@/store';

/** The bar's minimum height above the bottom inset; anything floating above it clears this. */
export const TAB_BAR_MIN_HEIGHT = 56;

function TabIcon({ name, focused }: { name: TabIconName; focused: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const active = useSharedValue(focused ? 1 : 0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    active.set(withTiming(focused ? 1 : 0, { duration: motion.duration.fast, easing: EASE_OUT }));
    // A small settle on the newly active icon; the color change alone carries the state under reduced motion.
    if (focused && !reduced) {
      iconScale.set(withSequence(withTiming(0.88, { duration: 90, easing: EASE_OUT }), withSpring(1, motion.spring.settle)));
    }
  }, [focused, reduced, active, iconScale]);

  // Absolute and childless, so animating it never re-lays-out the icon. It grows out from the icon's center.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: active.get(),
    transform: [{ scaleX: reduced ? 1 : 0.5 + active.get() * 0.5 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.get() }] }));

  return (
    <View style={styles.slot}>
      <Animated.View style={[styles.pill, pillStyle]} />
      <Animated.View style={iconStyle}>
        <MaterialCommunityIcons name={name} size={22} color={focused ? colors.primary : colors.textMuted} />
      </Animated.View>
    </View>
  );
}

/**
 * The one bottom bar, rendered by the root layout under the Stack so it stays on pushed screens too.
 * It owns the bottom safe-area inset; the Stack above it gets its own provider (see the root layout).
 */
export function TabBar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isGuest } = useSession();
  const { flags } = useFeatures();
  const keyboardOpen = useKeyboardOpen();
  const tabs = tabsForMode(isGuest, flags);

  // On a pushed screen no tab matches, so the last matched one stays highlighted.
  const matched = activeTabFor(pathname, tabs);
  const [lastActive, setLastActive] = useState(matched ?? 'index');
  if (matched && matched !== lastActive) setLastActive(matched);
  const active = matched ?? lastActive;

  if (hidesTabBar(pathname) || keyboardOpen) return null;

  const open = (tab: TabSpec) => {
    const path = tabPath(tab);
    const kind = tabSwitch(pathname, path);
    if (kind === 'none') return;
    // One tick per real switch; returning to the tab you are already on stays silent.
    if (tab.name !== active) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Between two tabs it is a tab jump. From or to a pushed screen it pops the root stack back to the tab
    // (or replaces the top screen when it is not below), so history never grows.
    // tabPath only builds paths of existing routes, so the cast does not hide an unknown route.
    if (kind === 'jump') router.navigate(path as Href);
    else router.dismissTo(path as Href);
  };

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {tabs
        .filter((tab) => !tab.hidden)
        .map((tab) => {
          const focused = tab.name === active;
          return (
            <Pressable
              key={tab.name}
              onPress={() => open(tab)}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{ selected: focused }}
              style={styles.item}>
              <TabIcon name={tab.icon} focused={focused} />
              <Text style={[styles.label, { color: focused ? colors.primary : colors.textMuted }]} numberOfLines={1}>
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    minHeight: TAB_BAR_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    ...typeScale.caption,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.sansMedium,
    marginTop: 2,
  },
  slot: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
}));
