import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { CSS_EASE_OUT, FADE_IN } from '@/constants/motion';
import { motion } from '@/constants/theme';

const RISE = {
  from: { opacity: 0, transform: [{ translateY: motion.rise }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
// Reduced motion keeps the fade (it explains new content) and drops the movement.

type Props = {
  children: ReactNode;
  /** Position in a list; the first `motion.stagger.maxItems` items enter 40 ms apart, the rest together. */
  index?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * One-time mount entrance for cards and list items: a short fade and 8 dp rise on the UI thread.
 * Use it on FlatList/ScrollView children, not on recycled FlashList rows (a recycled row would not replay).
 */
export function FadeInView({ children, index = 0, style }: Props) {
  const reduced = useReducedMotion();
  const delay = Math.min(index, motion.stagger.maxItems - 1) * motion.stagger.step;

  return (
    <Animated.View
      style={[
        style,
        {
          animationName: reduced ? FADE_IN : RISE,
          animationDuration: motion.duration.enter,
          animationDelay: reduced ? 0 : delay,
          animationTimingFunction: CSS_EASE_OUT,
          animationFillMode: 'backwards',
        },
      ]}>
      {children}
    </Animated.View>
  );
}
