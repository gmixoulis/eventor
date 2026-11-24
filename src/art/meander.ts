// Fret pattern (meander) generator: one continuous, non-crossing stroke with even spacing.
import { n2, type Point } from '@/art/random';

export type MeanderTurns = 1 | 2;

/**
 * One repeat of the key on a cell grid (x right, y down). The line enters at the bottom left,
 * spirals inward along one track, comes back out along the parallel track and leaves along the
 * bottom, so every gap is exactly one cell. `rows` is the band height in cells, `period` the repeat width.
 */
const MODULES: Record<MeanderTurns, { rows: number; period: number; points: [number, number][] }> = {
  1: {
    rows: 3,
    period: 4,
    points: [[0, 3], [0, 0], [3, 0], [3, 2], [2, 2], [2, 1], [1, 1], [1, 3]],
  },
  2: {
    rows: 5,
    period: 6,
    points: [[0, 5], [0, 0], [5, 0], [5, 4], [2, 4], [2, 2], [3, 2], [3, 3], [4, 3], [4, 1], [1, 1], [1, 5]],
  },
};

export type MeanderShape = { d: string; length: number; start: Point; end: Point };

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function toPath(points: Point[], close = false): string {
  const body = points.map((p, i) => `${i ? 'L' : 'M'}${n2(p.x)} ${n2(p.y)}`).join(' ');
  return close ? `${body} Z` : body;
}

/** Strip points in cell units for `count` repeats, starting at x = 0 on the bottom line. */
function stripCells(count: number, turns: MeanderTurns): Point[] {
  const { period, points } = MODULES[turns];
  const out: Point[] = [];
  for (let m = 0; m < count; m++) {
    for (const [x, y] of points) out.push({ x: x + m * period, y });
  }
  return out;
}

export function meanderRows(turns: MeanderTurns = 1): number {
  return MODULES[turns].rows;
}

/**
 * A horizontal key band from (0, height) to (width, height). `unit` is the cell width; the cell
 * height is height / rows so the band always fills the given height. Whole repeats are centered,
 * with plain bottom-line lead-in and tail where the width leaves a remainder.
 */
export function meanderPath(width: number, height: number, unit: number, turns: MeanderTurns = 1): MeanderShape {
  const { rows, period } = MODULES[turns];
  const cellY = height / rows;
  const count = Math.max(0, Math.floor(width / (period * unit)));
  const lead = (width - count * period * unit) / 2;
  const points: Point[] = [{ x: 0, y: height }];
  for (const p of stripCells(count, turns)) points.push({ x: lead + p.x * unit, y: p.y * cellY });
  points.push({ x: width, y: height });
  // Drop zero-length steps (lead-in of 0) so the dash math stays exact.
  const clean = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  const start = clean[0];
  const end = clean[clean.length - 1];
  return { d: toPath(clean), length: polylineLength(clean), start, end };
}

/**
 * A closed key ring: the strip bent around (cx, cy), its top edge on `outerRadius` and its bottom
 * edge on `innerRadius`, with `repeats` whole modules so the seam meets itself. Horizontal runs are
 * subdivided into short chords so they read as arcs.
 */
export function meanderRing(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  repeats: number,
  turns: MeanderTurns = 1,
): MeanderShape {
  const { rows, period } = MODULES[turns];
  const count = Math.max(1, Math.round(repeats));
  const totalX = count * period;
  const cells = stripCells(count, turns);
  cells.push({ x: totalX, y: rows });
  const polar = (p: Point): Point => {
    const angle = (p.x / totalX) * Math.PI * 2 - Math.PI / 2;
    const r = outerRadius - (p.y / rows) * (outerRadius - innerRadius);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };
  const points: Point[] = [polar(cells[0])];
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1];
    const b = cells[i];
    const steps = a.y === b.y ? Math.max(1, Math.ceil(Math.abs(b.x - a.x) * 2)) : 1;
    for (let s = 1; s <= steps; s++) {
      points.push(polar({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps }));
    }
  }
  // The last point lands on the first; Z closes it without a duplicate vertex.
  const closed = points.slice(0, -1);
  return { d: toPath(closed, true), length: polylineLength(points), start: points[0], end: points[points.length - 1] };
}
