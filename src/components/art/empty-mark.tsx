import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { meanderRing } from '@/art/meander';
import { rosettePath } from '@/art/ornament';
import { hashString } from '@/lib/utils';
import { useTheme } from '@/components/theme';

const SIZE = 76;

/**
 * A small medallion for empty states: a meander ring around a rosette, both from the kit.
 * The seed (the empty state's title) picks the petal count and turn, so each empty state is
 * its own mark. Decorative, hidden from screen readers.
 */
export function EmptyMark({ seed }: { seed: string }) {
  const { colors } = useTheme();
  const h = hashString(seed);
  const petals = 5 + (h % 4);
  const ring = meanderRing(50, 50, 47, 39, 10 + (h >>> 3) % 3);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={50} fill={colors.artYellow} />
        <Path d={ring.d} fill="none" stroke={colors.onArt} strokeWidth={1.6} strokeLinejoin="miter" />
        <Path d={rosettePath(50, 50, 18, petals, ((h >>> 6) % 90) * (Math.PI / 180))} fill={colors.artRed} />
        <Circle cx={50} cy={50} r={4} fill={colors.onArt} />
      </Svg>
    </View>
  );
}
