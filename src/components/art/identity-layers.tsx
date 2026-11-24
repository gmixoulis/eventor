import type { ReactNode } from 'react';
import { Circle, G, Path } from 'react-native-svg';

import { INTEREST_POSITIONS, type IdentityLayer, type InkSlot, type InterestMotif } from '@/art/identity';
import { meanderPath, meanderRing, meanderRows } from '@/art/meander';
import { fanPath, keyTilePath, polar, rosettePath, waveLinePath, waveRingPath } from '@/art/ornament';

export const BAND_W = 400;
export const BAND_H = 100;

/** What every layer renderer needs: shape, detail level, stroke width, rotation and the inks. */
export type LayerCtx = {
  band: boolean;
  low: boolean;
  sw: number;
  rotation: number;
  tone: (slot: InkSlot) => string;
  sparkOutline: string | undefined;
};

type LayerOf<K extends IdentityLayer['kind']> = Extract<IdentityLayer, { kind: K }>;
type InterestLayer = LayerOf<'interest'>;
type Center = { x: number; y: number; s: number; angle: number };
type MotifArgs = { layer: InterestLayer; c: Center; ink: string; color: string; outline: string | undefined; sw: number };

function interestCenter(layer: InterestLayer, band: boolean): Center {
  const t = (layer.position + layer.ring * 0.5) / INTEREST_POSITIONS;
  if (band) return { x: 100 + t * 285, y: layer.ring ? 60 : 42, s: 8, angle: -Math.PI / 2 };
  const angle = t * Math.PI * 2 - Math.PI / 2;
  const p = polar(50, 50, layer.ring ? 22.5 : 31.5, angle);
  return { x: p.x, y: p.y, s: 4.6, angle };
}

const MOTIFS: Record<InterestMotif, (args: MotifArgs) => ReactNode> = {
  key: ({ layer, c, ink, sw }) =>
    <Path d={keyTilePath(c.x, c.y, c.s * 0.8, layer.quarter)} fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="miter" />,
  fan: ({ layer, c, ink, sw }) =>
    <Path d={fanPath(c.x, c.y, c.s, c.angle + (layer.quarter - 1.5) * 0.3)} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />,
  rings: ({ c, ink, color, outline, sw }) => (
    <G>
      <Circle cx={c.x} cy={c.y} r={c.s} fill="none" stroke={ink} strokeWidth={sw} />
      <Circle cx={c.x} cy={c.y} r={c.s * 0.45} fill={color} stroke={outline} strokeWidth={sw * 0.5} />
    </G>
  ),
  dots: ({ layer, c, color, outline, sw }) => (
    <G>
      {[0, 1, 2].map((i) => {
        const p = polar(c.x, c.y, c.s * 0.6, c.angle + (layer.quarter * Math.PI) / 2 + (i * Math.PI * 2) / 3);
        return <Circle key={i} cx={p.x} cy={p.y} r={c.s * 0.32} fill={color} stroke={outline} strokeWidth={sw * 0.5} />;
      })}
    </G>
  ),
  bud: ({ layer, c, color, outline, sw }) =>
    <Path d={rosettePath(c.x, c.y, c.s, 4, (layer.quarter * Math.PI) / 8)} fill={color} stroke={outline} strokeWidth={sw * 0.5} />,
};

const RENDERERS: { [K in IdentityLayer['kind']]: (layer: LayerOf<K>, ctx: LayerCtx) => ReactNode } = {
  meander: (layer, { band, low, sw, rotation, tone }) => {
    const ink = tone('ink');
    if (band) {
      const h = 16;
      const top = meanderPath(BAND_W - 8, h, h / meanderRows(layer.turns), layer.turns);
      return <Path d={top.d} transform="translate(4 4)" fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="miter" />;
    }
    if (low) return <Circle cx={50} cy={50} r={45.5} fill="none" stroke={ink} strokeWidth={sw * 1.3} />;
    const ring = meanderRing(50, 50, 47.5, 41.5, layer.repeats, layer.turns);
    return <Path d={ring.d} transform={`rotate(${rotation} 50 50)`} fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="miter" />;
  },
  role: (layer, { band, low, sw, rotation, tone, sparkOutline }) => {
    if (low) return null;
    const fill = tone('spark');
    if (band) {
      return Array.from({ length: layer.count }, (_, i) => (
        <Circle key={i} cx={24 + i * 9} cy={88} r={2.6} fill={fill} stroke={sparkOutline} strokeWidth={sw * 0.4} />
      ));
    }
    return Array.from({ length: layer.count }, (_, i) => {
      const p = polar(50, 50, 38.3, (rotation * Math.PI) / 180 + (i / layer.count) * Math.PI * 2);
      return <Circle key={i} cx={p.x} cy={p.y} r={1.3} fill={fill} stroke={sparkOutline} strokeWidth={sw * 0.3} />;
    });
  },
  interest: (layer, { band, low, sw, tone, sparkOutline }) => {
    const c = interestCenter(layer, band);
    const color = tone(layer.slot);
    const outline = layer.slot === 'spark' ? sparkOutline : undefined;
    // At small sizes every interest is a filled disc: position alone carries the identity.
    if (low) return <Circle cx={c.x} cy={c.y} r={3.6} fill={color} stroke={outline} strokeWidth={sw * 0.5} />;
    return MOTIFS[layer.motif]({ layer, c, ink: tone('ink'), color, outline, sw });
  },
  wave: (layer, { band, low, sw, tone }) => {
    const ink = tone('ink');
    if (band) {
      return <Path d={waveLinePath(100, 392, 80, layer.amplitude * 2.5, layer.frequency * 2)} fill="none" stroke={ink} strokeWidth={sw} />;
    }
    const amp = low ? layer.amplitude * 1.4 : layer.amplitude;
    return <Path d={waveRingPath(50, 50, 14, amp, layer.frequency)} fill="none" stroke={ink} strokeWidth={low ? sw * 1.2 : sw} />;
  },
  rosette: (layer, { band, sw, rotation, tone, sparkOutline }) => {
    const outline = layer.slot === 'spark' ? sparkOutline : undefined;
    const [cx, cy, r] = band ? [50, 52, 24] : [50, 50, 10];
    return <Path d={rosettePath(cx, cy, r, layer.petals, (rotation * Math.PI) / 180)} fill={tone(layer.slot)} stroke={outline} strokeWidth={sw * 0.5} />;
  },
};

/** Draws one layer with the renderer for its kind. */
export function renderLayer(layer: IdentityLayer, ctx: LayerCtx): ReactNode {
  // TypeScript cannot pair a union member with its Record entry; RENDERERS' mapped type keeps each pair correct.
  const render = RENDERERS[layer.kind] as (layer: IdentityLayer, ctx: LayerCtx) => ReactNode;
  return render(layer, ctx);
}
