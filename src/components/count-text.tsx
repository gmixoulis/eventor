import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE_OUT } from '@/constants/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
/** Long enough to read as counting, short enough not to hold the eye. */
const COUNT_MS = 420;

type Props = {
  value: number;
  /** A typeScale entry plus color, as for any Text. */
  style: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/**
 * A number that counts to its new value on the UI thread instead of jumping (state indication).
 * It is a read-only TextInput because Reanimated can write `text` to one without a React render.
 * The first value shows as is; reduced motion jumps straight to each new value.
 * Screen readers get one labelled, read-only element: the wrapper, with the input hidden.
 */
export function CountText({ value, style, accessibilityLabel }: Props) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(value);
  // The text the native view starts from; later values arrive through animated props.
  const [initial] = useState(String(value));

  useEffect(() => {
    shown.set(reduced ? value : withTiming(value, { duration: COUNT_MS, easing: EASE_OUT }));
  }, [shown, value, reduced]);

  const animatedProps = useAnimatedProps(() => {
    const text = String(Math.round(shown.get()));
    return { text, defaultValue: text };
  });

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? String(value)}>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        defaultValue={initial}
        animatedProps={animatedProps}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.reset, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // A TextInput carries field padding by default; this one should sit like text.
  reset: { padding: 0, margin: 0, includeFontPadding: false, fontVariant: ['tabular-nums'] },
});
