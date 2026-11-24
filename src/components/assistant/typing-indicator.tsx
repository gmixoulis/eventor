import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles } from '@/components/theme';
import { EASE_OUT } from '@/constants/motion';
import { radius, spacing } from '@/constants/theme';

const STEP_MS = 160;

function Dot({ index, reduced }: { index: number; reduced: boolean }) {
  const styles = useStyles();
  const level = useSharedValue(0.35);
  useEffect(() => {
    if (reduced) return;
    level.set(withDelay(index * STEP_MS, withRepeat(withSequence(
      withTiming(1, { duration: 360, easing: EASE_OUT }),
      withTiming(0.35, { duration: 360, easing: EASE_OUT }),
    ), -1)));
    return () => cancelAnimation(level);
  }, [index, level, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: level.get() }));
  return <Animated.View style={[styles.dot, animated]} />;
}

/** Three pulsing dots; under reduced motion they stay still. */
export function TypingIndicator() {
  const styles = useStyles();
  const reduced = useReducedMotion();
  return (
    <View
      style={styles.bubble}
      accessible
      accessibilityLabel="The assistant is answering"
      accessibilityLiveRegion="polite">
      {[0, 1, 2].map((i) => <Dot key={i} index={i} reduced={reduced} />)}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.textMuted },
}));
