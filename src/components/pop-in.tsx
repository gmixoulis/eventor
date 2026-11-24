import type { ReactNode } from 'react';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { CSS_EASE_OUT, FADE_IN, POP } from '@/constants/motion';
import { motion } from '@/constants/theme';

/**
 * Brief feedback for a just-earned stamp, seat or challenge (rare tier: feedback): the content
 * pops in once from 94 percent. Without `celebrate` it renders still. Reduced motion keeps a fade.
 */
export function PopIn({ celebrate, children }: { celebrate: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (!celebrate) return children;
  return (
    <Animated.View
      style={{
        animationName: reduced ? FADE_IN : POP,
        animationDuration: motion.duration.enter,
        animationTimingFunction: CSS_EASE_OUT,
        animationFillMode: 'backwards',
      }}>
      {children}
    </Animated.View>
  );
}
