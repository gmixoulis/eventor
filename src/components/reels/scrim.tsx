import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  /** 'up' darkens the bottom (text sits there); 'down' darkens the top. */
  direction?: 'up' | 'down';
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/** Dark-to-transparent gradient that keeps white text readable over video. */
export function Scrim({ direction = 'up', opacity = 0.75, style }: Props) {
  const id = `scrim-${direction}`;
  return (
    <View pointerEvents="none" style={style}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1={direction === 'up' ? '0' : '1'} x2="0" y2={direction === 'up' ? '1' : '0'}>
            <Stop offset="0" stopColor="black" stopOpacity={0} />
            <Stop offset="1" stopColor="black" stopOpacity={opacity} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
