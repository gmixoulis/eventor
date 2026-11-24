import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { sharedLayers, type IdentityLayer, type IdentitySpec } from '@/art/identity';
import { BAND_H, BAND_W, renderLayer, type LayerCtx } from '@/components/art/identity-layers';
import { MeanderLine } from '@/components/art/meander-line';
import { makeStyles, useTheme } from '@/components/theme';
import { CSS_EASE_OUT, FADE_IN } from '@/constants/motion';
import { motion } from '@/constants/theme';

export type IdentityShape = 'circle' | 'square' | 'band';

type Props = {
  spec: IdentitySpec;
  /** Width in dp. Circle and square are square; a band is 4:1. */
  size: number;
  shape?: IdentityShape;
  /** Layer ids to draw stronger; every other layer dims. */
  highlightLayers?: string[];
  /** Layers draw in once on mount (under 900 ms), no loop. */
  animated?: boolean;
};

const LAYER_MS = 420;
const LAYER_STEP = 60;
const MAX_DELAY = 420;
const DRAW_IN = {
  from: { opacity: 0, transform: [{ rotate: '-12deg' }, { scale: 0.96 }] },
  to: { opacity: 1, transform: [{ rotate: '0deg' }, { scale: 1 }] },
};
const DRAW_IN_BAND = {
  from: { opacity: 0, transform: [{ translateX: -6 }] },
  to: { opacity: 1, transform: [{ translateX: 0 }] },
};
// Reduced motion keeps a short fade: it still explains that the pattern arrived.

/** Below this size the pattern drops fine detail (key teeth, role dots) so it stays crisp. */
const LOW_DETAIL_BELOW = 88;

/**
 * Generative identity mark. Palette slots map to theme tokens: ground to primarySoft, ink to
 * primary or text, spark to accent. In light mode accent fills get a hairline ink outline, since
 * sun yellow on primarySoft is too faint on its own.
 */
export function IdentityPattern({ spec, size, shape = 'circle', highlightLayers, animated = false }: Props) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const band = shape === 'band';
  const width = size;
  const height = band ? size / 4 : size;
  const viewW = band ? BAND_W : 100;
  const viewBox = band ? `0 0 ${BAND_W} ${BAND_H}` : '0 0 100 100';
  const unitsPerDp = viewW / width;
  // About 1.2 dp at small sizes, a steady 1 unit (bolder) at large ones.
  const sw = Math.max(band ? 1.5 : 1, 1.2 * unitsPerDp);
  const ink = colors[spec.palette.ink];
  const spark = spec.palette.spark ? colors[spec.palette.spark] : ink;
  const ctx: LayerCtx = {
    band,
    low: !band && size < LOW_DETAIL_BELOW,
    sw,
    rotation: spec.rotation,
    tone: (slot) => (slot === 'spark' ? spark : ink),
    sparkOutline: scheme === 'light' && spec.palette.spark ? ink : undefined,
  };
  const highlight = highlightLayers ? new Set(highlightLayers) : null;

  const ground = band ? (
    <Rect x={0} y={0} width={BAND_W} height={BAND_H} rx={10} fill={colors[spec.palette.ground]} />
  ) : shape === 'square' ? (
    <Rect x={0} y={0} width={100} height={100} rx={12} fill={colors[spec.palette.ground]} />
  ) : (
    <Circle cx={50} cy={50} r={50} fill={colors[spec.palette.ground]} />
  );

  const layerNode = (layer: IdentityLayer) => {
    const on = !highlight || highlight.has(layer.id);
    const node = renderLayer(layer, highlight && on ? { ...ctx, sw: sw * 1.5 } : ctx);
    return node === null ? null : <G opacity={on ? 1 : 0.22}>{node}</G>;
  };

  if (!animated) {
    return (
      <View style={{ width, height }} accessible={false} importantForAccessibility="no-hide-descendants">
        <Svg width={width} height={height} viewBox={viewBox}>
          {ground}
          {spec.layers.map((layer) => <G key={layer.id}>{layerNode(layer)}</G>)}
        </Svg>
      </View>
    );
  }

  // Animated: each layer on its own canvas so it can turn and fade in on the UI thread.
  return (
    <View style={{ width, height }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={viewBox} style={StyleSheet.absoluteFill}>
        {ground}
      </Svg>
      {spec.layers.map((layer, i) => (
        <Animated.View
          key={layer.id}
          style={[
            styles.layer,
            {
              animationName: reduced ? FADE_IN : band ? DRAW_IN_BAND : DRAW_IN,
              animationDuration: reduced ? motion.duration.fast : LAYER_MS,
              animationDelay: reduced ? 0 : Math.min(i * LAYER_STEP, MAX_DELAY),
              animationTimingFunction: CSS_EASE_OUT,
              animationFillMode: 'backwards',
            },
          ]}>
          <Svg width={width} height={height} viewBox={viewBox}>
            {layerNode(layer)}
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

type PairProps = { a: IdentitySpec; b: IdentitySpec; size: number };

/** Two marks side by side, their common layers drawn strong, joined by a short key link. */
export function IdentityPair({ a, b, size }: PairProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const shared = sharedLayers(a, b);
  const linkWidth = Math.round(size * 0.5);
  return (
    <View style={styles.pair} accessible={false} importantForAccessibility="no-hide-descendants">
      <IdentityPattern spec={a} size={size} highlightLayers={shared} />
      <MeanderLine
        width={linkWidth}
        height={Math.max(9, Math.round(size * 0.1))}
        unit={Math.max(3, size * 0.033)}
        color={shared.length ? colors.primary : colors.borderStrong}
        strokeWidth={Math.max(1, size / 96)}
      />
      <IdentityPattern spec={b} size={size} highlightLayers={shared} />
    </View>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  layer: StyleSheet.absoluteFill,
  pair: { flexDirection: 'row', alignItems: 'center' },
}));
