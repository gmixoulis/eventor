import Svg, { Circle, Path } from 'react-native-svg';

import { lightColors } from '@/constants/theme';

// The welcome screen stays light, so the collage keeps the light theme's art colours in both themes.
const { artRed: ART_RED, artYellow: ART_YELLOW, artPink: ART_PINK } = lightColors;

/** Closed star polygon in a 100x100 box, alternating outer and inner radii. */
function starPath(spikes: number, outer: number, inner: number): string {
  const points = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${points.join('L')}Z`;
}

const OUTER_STAR = starPath(14, 50, 34);
const INNER_STAR = starPath(10, 30, 16);
const SCALLOPS = Array.from({ length: 12 }, (_, i) => (Math.PI * 2 * i) / 12);

export type ArtShape = 'starburst' | 'scallop' | 'rings' | 'dot';

/** One flat decorative shape filling its box; size the box with the parent style. */
export function ArtShapeView({ shape }: { shape: ArtShape }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      {shape === 'starburst' ? (
        <>
          <Path d={OUTER_STAR} fill={ART_RED} />
          <Path d={INNER_STAR} fill={ART_YELLOW} />
        </>
      ) : null}
      {shape === 'scallop' ? (
        <>
          {SCALLOPS.map((a) => (
            <Circle key={a} cx={50 + 37 * Math.cos(a)} cy={50 + 37 * Math.sin(a)} r={12} fill={ART_PINK} />
          ))}
          <Circle cx={50} cy={50} r={37} fill={ART_PINK} />
        </>
      ) : null}
      {shape === 'rings' ? (
        <>
          <Circle cx={50} cy={50} r={50} fill={ART_RED} />
          <Circle cx={50} cy={50} r={36} fill={ART_YELLOW} />
          <Circle cx={50} cy={50} r={22} fill={ART_RED} />
          <Circle cx={50} cy={50} r={9} fill={ART_YELLOW} />
        </>
      ) : null}
      {shape === 'dot' ? <Circle cx={50} cy={50} r={50} fill={ART_YELLOW} /> : null}
    </Svg>
  );
}
