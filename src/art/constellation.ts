// Passport constellation layout. Stars sit on a jittered grid walked in serpentine order;
// each kind takes a contiguous run of that walk, so its figure links only neighboring cells
// and figures never cut across the sky.
import { seeded } from '@/art/random';

export type Star = { id: string; kind: string; x: number; y: number; magnitude: number };
export type StarLink = { from: string; to: string; group: string };
export type ConstellationLayout = { width: number; height: number; stars: Star[]; links: StarLink[] };

/** Jitter as a fraction of a cell, each way. Neighbors stay at least (1 - 2 * JITTER) cells apart. */
const JITTER = 0.22;
/** Spare cells, so the sky has gaps instead of a full grid. */
const SPARE = 1.5;
const MARGIN = 0.08;

export function constellationLayout(
  targets: { id: string; kind: string }[],
  seed: string,
  width: number,
  height: number,
): ConstellationLayout {
  const rand = seeded(seed);
  // Group by kind, kinds in order of first appearance, targets in given order within a kind.
  const kinds = [...new Set(targets.map((t) => t.kind))];
  const ordered = kinds.flatMap((kind) => targets.filter((t) => t.kind === kind));
  const n = ordered.length;
  if (!n) return { width, height, stars: [], links: [] };

  const innerW = width * (1 - MARGIN * 2);
  const innerH = height * (1 - MARGIN * 2);
  const cellCount = Math.max(n, Math.ceil(n * SPARE));
  const cols = Math.max(1, Math.ceil(Math.sqrt((cellCount * innerW) / innerH)));
  const rows = Math.max(1, Math.ceil(cellCount / cols));
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  const walk: { col: number; row: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < cols; i++) walk.push({ col: row % 2 ? cols - 1 - i : i, row });
  }
  // Keep n cells of the walk, skipping spares at seeded positions; order is preserved.
  let spares = walk.length - n;
  const kept = walk.filter((_, i) => {
    const remaining = walk.length - i;
    if (spares > 0 && (spares >= remaining || rand() < spares / remaining)) {
      spares -= 1;
      return false;
    }
    return true;
  });

  const stars: Star[] = ordered.map((t, i) => {
    const cell = kept[i];
    return {
      id: t.id,
      kind: t.kind,
      x: width * MARGIN + (cell.col + 0.5 + (rand() * 2 - 1) * JITTER) * cellW,
      y: height * MARGIN + (cell.row + 0.5 + (rand() * 2 - 1) * JITTER) * cellH,
      magnitude: Math.round((0.55 + rand() * 0.45) * 100) / 100,
    };
  });

  const links: StarLink[] = [];
  for (const kind of kinds) {
    const group = stars.filter((s) => s.kind === kind);
    for (let i = 1; i < group.length; i++) links.push({ from: group[i - 1].id, to: group[i].id, group: kind });
  }
  return { width, height, stars, links };
}

/** Smallest distance between any two stars; at least (1 - 2 * JITTER) of the smaller cell side. */
export function minStarSpacing(layout: ConstellationLayout): number {
  let min = Infinity;
  for (let i = 0; i < layout.stars.length; i++) {
    for (let j = i + 1; j < layout.stars.length; j++) {
      const a = layout.stars[i];
      const b = layout.stars[j];
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return min;
}
