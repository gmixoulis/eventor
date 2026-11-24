import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ArtShapeView, type ArtShape } from '@/components/auth/welcome-art';
import { FadeInView } from '@/components/fade-in-view';
import { ImageSlot } from '@/components/image-slot';
import { brand } from '@/constants/brand';
import { lightColors } from '@/constants/theme';

/** The wordmark is black artwork, so the welcome page stays on the light paper in both themes. */
export const WELCOME_PAPER = lightColors.card;

type Box = {
  left?: DimensionValue;
  right?: DimensionValue;
  top: DimensionValue;
  /** Share of the band's height, so tiles shrink with short screens instead of colliding. */
  height: DimensionValue;
  aspectRatio: number;
};

type Tile = Box &
  (
    | { shape: ArtShape }
    | { source: (typeof brand)['artOwl']; position: 'left' | 'right' }
  );

// The speaker strips hold a cut-out at their left edge and a poster at their right; narrow crops keep only one.
const TOP: Tile[] = [
  { shape: 'starburst', left: '-14%', top: '-18%', height: '90%', aspectRatio: 1 },
  { source: brand.artPegasus, position: 'left', right: '-6%', top: '14%', height: '82%', aspectRatio: 1 },
];

const BOTTOM: Tile[] = [
  { source: brand.artStoneBird, position: 'left', left: '-4%', top: '4%', height: '50%', aspectRatio: 0.55 },
  { source: brand.artOwl, position: 'right', right: '-2%', top: '0%', height: '56%', aspectRatio: 0.42 },
  { shape: 'scallop', left: '34%', top: '22%', height: '30%', aspectRatio: 1 },
  { source: brand.artStoneSun, position: 'left', left: '-6%', top: '58%', height: '40%', aspectRatio: 0.55 },
  { shape: 'rings', left: '30%', top: '66%', height: '24%', aspectRatio: 1 },
  { shape: 'dot', right: '-12%', top: '62%', height: '42%', aspectRatio: 1 },
];

/** One-time entrance on the UI thread (fade and short rise), skipped entirely under reduced motion. */
export function Settle({ index, style, children }: { index: number; style?: ViewStyle; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <FadeInView index={index} style={style}>
      {children}
    </FadeInView>
  );
}

function Band({ tiles, offset, flex }: { tiles: Tile[]; offset: number; flex: number }) {
  return (
    // Decorative only: hidden from screen readers on both platforms.
    <View
      style={[styles.band, { flex }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none">
      {tiles.map((tile, i) => {
        const box: ViewStyle = {
          position: 'absolute',
          left: tile.left,
          right: tile.right,
          top: tile.top,
          height: tile.height,
          aspectRatio: tile.aspectRatio,
        };
        return (
          <Settle key={i} index={offset + i} style={box}>
            {'shape' in tile ? (
              <ArtShapeView shape={tile.shape} />
            ) : (
              <ImageSlot source={tile.source} aspectRatio={tile.aspectRatio} label="" radius={0} position={tile.position} background={WELCOME_PAPER} />
            )}
          </Settle>
        );
      })}
    </View>
  );
}

/** Collage above the wordmark. */
export function CollageTop() {
  return <Band tiles={TOP} offset={0} flex={1} />;
}

/** Collage between the wordmark and the pinned button. */
export function CollageBottom() {
  return <Band tiles={BOTTOM} offset={TOP.length} flex={1.6} />;
}

const styles = StyleSheet.create({
  band: { overflow: 'hidden' },
});
