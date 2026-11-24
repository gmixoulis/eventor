import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { StoryProgress } from '@/components/home/story-progress';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listAnnouncements } from '@/data';
import { relativeAge } from '@/lib/format';
import { useAnnouncements } from '@/store';

const STORY_MS = 6000;
const HOLD_MS = 250;
const SWIPE_CLOSE_PX = 80;

export default function AnnouncementsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const items = listAnnouncements();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { markRead } = useAnnouncements();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progress = useSharedValue(0);
  const startY = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const current = items[index];

  // Moving past the last story leaves `current` undefined, which closes the viewer below.
  const goTo = (next: number) => {
    if (next < 0) return;
    progress.set(0);
    setIndex(next);
  };

  useEffect(() => {
    if (current) markRead(current.id);
  }, [current, markRead]);

  useEffect(() => {
    if (!current) router.back();
  }, [current]);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    if (paused) return;
    // Resume from wherever the bar stopped, so a pause keeps its place.
    progress.set(
      withTiming(1, { duration: STORY_MS * (1 - progress.get()), easing: Easing.linear }, (finished) => {
        if (finished) {
          progress.set(0);
          scheduleOnRN(setIndex, index + 1);
        }
      }),
    );
    return () => cancelAnimation(progress);
  }, [index, paused, reduceMotion, progress]);

  if (!current) return null;

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        startY.current = e.nativeEvent.pageY;
        holdTimer.current = setTimeout(() => setPaused(true), HOLD_MS);
      }}
      onResponderRelease={(e) => {
        clearTimeout(holdTimer.current);
        const { pageX, pageY } = e.nativeEvent;
        if (pageY - startY.current > SWIPE_CLOSE_PX) {
          router.back();
        } else if (paused) {
          setPaused(false);
        } else {
          goTo(pageX < width / 2 ? index - 1 : index + 1);
        }
      }}
      onResponderTerminate={() => {
        clearTimeout(holdTimer.current);
        setPaused(false);
      }}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accentSoft} />
            <Stop offset="1" stopColor={colors.bg} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <StoryProgress count={items.length} index={index} progress={progress} />
        <View style={styles.meta}>
          <View style={styles.badge}>
            <FontAwesome5 name="bullhorn" size={12} color={colors.onArt} />
          </View>
          <Text style={styles.source}>Announcements</Text>
          <Text style={styles.age}>{relativeAge(current.date)}</Text>
          <View style={styles.spacer} />
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close announcements">
            <FontAwesome5 name="times" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.text}>{current.body}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1 },
  top: { paddingHorizontal: spacing.md, gap: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.artYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  source: { ...typeScale.label, color: colors.text },
  age: { ...typeScale.caption, color: colors.textMuted },
  spacer: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  title: { ...typeScale.title, color: colors.text },
  text: { ...typeScale.body, color: colors.text },
}));
