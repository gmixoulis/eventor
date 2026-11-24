import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/components/theme';
import { EASE_OUT } from '@/constants/motion';
import { motion } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** 'scale' for buttons and cards; 'highlight' for full-width rows, where scaling the whole row looks wrong. */
  feedback?: 'scale' | 'highlight';
};

/**
 * Press feedback on the UI thread: quick timing in, settle out.
 * Reduced motion drops the scale and keeps the dim or the background highlight.
 */
export function PressableScale({ style, feedback = 'scale', onPressIn, onPressOut, ...rest }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const flat = StyleSheet.flatten(style);
  // The animated values win over the static ones, so they carry the caller's (e.g. a disabled dim).
  const baseOpacity = flat?.opacity ?? 1;
  const baseBg = typeof flat?.backgroundColor === 'string' ? flat.backgroundColor : 'transparent';
  const highlight = feedback === 'highlight';

  const animatedStyle = useAnimatedStyle(() => {
    const p = pressed.get();
    if (highlight) {
      return { backgroundColor: interpolateColor(p, [0, 1], [baseBg, colors.highlight]) };
    }
    return {
      opacity: baseOpacity * (1 - p * 0.12),
      transform: [{ scale: reduced ? 1 : 1 - p * 0.03 }],
    };
  });

  return (
    <AnimatedPressable
      {...rest}
      pressRetentionOffset={16}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: motion.duration.press, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(
          highlight
            ? withTiming(0, { duration: motion.duration.fast, easing: EASE_OUT })
            : withSpring(0, motion.spring.settle),
        );
        onPressOut?.(e);
      }}
    />
  );
}
