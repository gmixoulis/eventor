import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { cityHour, tintAtHour } from '@/art/sky-light';

type Props = {
  height: number;
  /** The event clock's now. The band follows New York time whatever the device zone is. */
  date: Date;
  style?: StyleProp<ViewStyle>;
};

/**
 * A barely-there wash for the top of Home: the New York tint fading to clear. It sits behind
 * content and is hidden from screen readers. Static on purpose: it changes with the clock.
 *
 * The tint's alpha goes on the stop as stopOpacity with an opaque rgb color: an rgba stopColor
 * lost its alpha on Android and painted the band as a solid beige block. The sun disc was
 * dropped: at this size it read as a stray dot behind the content.
 */
export function CitySky({ height, date, style }: Props) {
  const [width, setWidth] = useState(0);
  const [r, g, b, a] = tintAtHour(cityHour(date));
  const color = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  return (
    <View style={[{ height }, style]} onLayout={onLayout} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="city-sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={a} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#city-sky)" />
        </Svg>
      ) : null}
    </View>
  );
}
