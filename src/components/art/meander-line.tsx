import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  isSharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { meanderPath, type MeanderTurns } from '@/art/meander';
import { useTheme } from '@/components/theme';
import { EASE_OUT } from '@/constants/motion';
import { motion } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** One trip of the loader along the line. Constant motion, so linear. */
const LOOP_MS = 1600;
/** Share of the line the travelling reveal covers. */
const LOOP_SEGMENT = 0.28;

type Props = {
  width: number;
  height: number;
  /** Cell width of the key; the cell height is height divided by the key's rows. */
  unit: number;
  /** 0 to 1. A number animates to the new value (180 ms ease-out); a shared value is followed frame by frame. */
  progress?: SharedValue<number> | number;
  /** Indeterminate loader: a reveal travels along the line. Ignores `progress`. */
  loop?: boolean;
  color?: string;
  /** Faint full line under the reveal. Defaults to on for progress and loop, off for a full line. */
  track?: boolean;
  turns?: MeanderTurns;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The fret pattern as one stroke, revealed by stroke dash offset on the UI thread.
 * Reduced motion: the loader shows the full line still; progress jumps to its value without easing.
 */
export function MeanderLine({ width, height, unit, progress = 1, loop = false, color, track, turns = 1, strokeWidth = 1.5, style }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const stroke = color ?? colors.text;
  // Inset by half a stroke so the outer edges are not clipped.
  const shape = meanderPath(Math.max(0, width - strokeWidth), Math.max(0, height - strokeWidth), unit, turns);
  const length = shape.length;

  const own = useSharedValue(typeof progress === 'number' ? progress : 1);
  const source = isSharedValue<number>(progress) ? progress : own;
  const travel = useSharedValue(0);
  const looping = loop && !reduced;

  useEffect(() => {
    if (typeof progress !== 'number') return;
    own.set(reduced ? progress : withTiming(progress, { duration: motion.duration.fast, easing: EASE_OUT }));
  }, [own, progress, reduced]);

  useEffect(() => {
    if (!looping) return;
    travel.set(0);
    travel.set(withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(travel);
  }, [looping, travel]);

  const segment = length * LOOP_SEGMENT;
  // Only the offset animates; the dash pattern is a plain prop (the proven path in venue-plan.tsx).
  const dash = looping ? [segment, length + segment] : [length, length];
  const revealProps = useAnimatedProps(() => {
    // Looping: the dash starts just before the line and leaves past its end.
    if (looping) return { strokeDashoffset: segment - travel.get() * (length + segment) };
    const p = loop ? 1 : Math.min(1, Math.max(0, source.get()));
    return { strokeDashoffset: length * (1 - p) };
  });

  const showTrack = track ?? (loop || typeof progress !== 'number' || progress < 1);
  const half = strokeWidth / 2;

  return (
    <View style={[{ width, height }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`${-half} ${-half} ${width} ${height}`}>
        {showTrack ? (
          <Path d={shape.d} fill="none" stroke={stroke} strokeOpacity={0.2} strokeWidth={strokeWidth} strokeLinejoin="miter" />
        ) : null}
        <AnimatedPath
          d={shape.d}
          animatedProps={revealProps}
          strokeDasharray={dash}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
      </Svg>
    </View>
  );
}

type WrapperProps = { width: number; color?: string; style?: StyleProp<ViewStyle> };

/** Indeterminate loader, announced as a progress bar with the given label. */
export function MeanderLoader({ width, color, style, accessibilityLabel }: WrapperProps & { accessibilityLabel: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}>
      <MeanderLine width={width} height={12} unit={4} loop color={color} style={style} />
    </View>
  );
}

/** Static section divider in the border color. */
export function MeanderDivider({ width, color, style }: WrapperProps) {
  const { colors } = useTheme();
  return <MeanderLine width={width} height={9} unit={3} color={color ?? colors.borderStrong} strokeWidth={1} style={style} />;
}

/** Determinate progress, 0 to 1. */
export function MeanderProgress({ width, progress, color, style }: WrapperProps & { progress: SharedValue<number> | number }) {
  return <MeanderLine width={width} height={12} unit={4} progress={progress} color={color} track style={style} />;
}
