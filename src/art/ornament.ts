// Geometric ornament primitives as SVG path data. Traditional types used as grammar only:
// rosette, running wave, palmette fan, concentric rings, dotted bands, stepped key.
import { n2, type Point } from '@/art/random';

export function polar(cx: number, cy: number, r: number, angle: number): Point {
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

/** Rosette: `petals` pointed leaves from the center, each a pair of quadratic curves. */
export function rosettePath(cx: number, cy: number, r: number, petals: number, rotation = 0): string {
  const parts: string[] = [];
  const half = Math.PI / petals;
  for (let i = 0; i < petals; i++) {
    const a = rotation + (i / petals) * Math.PI * 2;
    const tip = polar(cx, cy, r, a);
    const left = polar(cx, cy, r * 0.62, a - half * 0.9);
    const right = polar(cx, cy, r * 0.62, a + half * 0.9);
    parts.push(
      `M${n2(cx)} ${n2(cy)} Q${n2(left.x)} ${n2(left.y)} ${n2(tip.x)} ${n2(tip.y)} Q${n2(right.x)} ${n2(right.y)} ${n2(cx)} ${n2(cy)} Z`,
    );
  }
  return parts.join(' ');
}

/** Running wave bent into a ring: radius oscillates `frequency` times around the circle. */
export function waveRingPath(cx: number, cy: number, r: number, amplitude: number, frequency: number): string {
  const steps = Math.max(48, frequency * 16);
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const p = polar(cx, cy, r + Math.sin(a * frequency) * amplitude, a);
    pts.push(`${i ? 'L' : 'M'}${n2(p.x)} ${n2(p.y)}`);
  }
  return `${pts.join(' ')} Z`;
}

/** Running wave along a horizontal line from x0 to x1. */
export function waveLinePath(x0: number, x1: number, y: number, amplitude: number, frequency: number): string {
  const steps = Math.max(24, frequency * 12);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    pts.push(`${i ? 'L' : 'M'}${n2(x)} ${n2(y + Math.sin(t * Math.PI * 2 * frequency) * amplitude)}`);
  }
  return pts.join(' ');
}

/** Palmette reduced to a fan of straight rays over a short stem, pointing along `angle`. */
export function fanPath(cx: number, cy: number, r: number, angle: number, rays = 5): string {
  const parts: string[] = [];
  const base = polar(cx, cy, r * 0.55, angle + Math.PI);
  for (let i = 0; i < rays; i++) {
    const spread = ((i / (rays - 1)) - 0.5) * Math.PI * 0.8;
    const tip = polar(cx, cy, r, angle + spread);
    parts.push(`M${n2(base.x)} ${n2(base.y)} L${n2(tip.x)} ${n2(tip.y)}`);
  }
  return parts.join(' ');
}

/** Small stepped key tile (a single hook) centered on (cx, cy), rotated by quarter turns. */
export function keyTilePath(cx: number, cy: number, r: number, quarter: number): string {
  const cells: [number, number][] = [[-1, 1], [-1, -1], [1, -1], [1, 0.33], [-0.33, 0.33], [-0.33, -0.33]];
  const a = (quarter % 4) * (Math.PI / 2);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return cells
    .map(([x, y], i) => {
      const px = cx + (x * cos - y * sin) * r;
      const py = cy + (x * sin + y * cos) * r;
      return `${i ? 'L' : 'M'}${n2(px)} ${n2(py)}`;
    })
    .join(' ');
}

/** Four-point glint (a thin cross star). */
export function glintPath(cx: number, cy: number, r: number): string {
  const q = r * 0.2;
  const pts: [number, number][] = [[0, -r], [q, -q], [r, 0], [q, q], [0, r], [-q, q], [-r, 0], [-q, -q]];
  return `${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n2(cx + x)} ${n2(cy + y)}`).join(' ')} Z`;
}
