import { cubicBezier, Easing } from 'react-native-reanimated';

import { motion } from '@/constants/theme';

// Built from the motion tokens here, not in theme.ts, so pure-logic tests can import the theme without Reanimated.

/** The ease-out curve for withTiming. */
export const EASE_OUT = Easing.bezier(...motion.easing.out);
/** The ease-out curve for Reanimated CSS animations and transitions. */
export const CSS_EASE_OUT = cubicBezier(...motion.easing.out);
/** A plain fade-in keyframe for Reanimated CSS animations; the reduced-motion entrance. */
export const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
/** The pop-in entrance keyframe for Reanimated CSS animations: fades in while growing from 94 percent. */
export const POP = { from: { opacity: 0, transform: [{ scale: 0.94 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } };
