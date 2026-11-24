import { listPlaces } from '@/data';
import type { Place } from '@/data/types';

export type Point = { x: number; y: number };
export type WalkingNode = Point & { id: string; name: string };
export type WalkingEdge = { from: string; to: string; metres: number };
export type WalkingGraph = { nodes: WalkingNode[]; edges: WalkingEdge[] };
export type VenueBlock = Point & {
  id: string; name: string; width: number; depth: number; height: number;
  category: Place['category']; entrance: Point;
};

// Original schematic only: assume a venue 200 m wide and 140 m deep, not a surveyed floor plan.
export const venue = { width: 200, depth: 140 };
export const entrance: WalkingNode = { id: 'entrance', name: 'Main entrance', x: 194, y: 48 };
export const blocks: VenueBlock[] = listPlaces().map((place) => {
  const { category } = place;
  const width = category === 'stage' ? 34 : 26;
  const depth = category === 'stage' ? 22 : 16;
  const x = place.x * venue.width;
  const y = place.y * venue.depth;
  const corridor = y > 80 ? 94 : 48;
  return { id: place.id, name: place.name, x, y, width, depth,
    height: category === 'stage' ? 12 : category === 'lounge' ? 4 : 6,
    category, entrance: { x, y: y + (corridor > y ? depth / 2 : -depth / 2) } };
});

export const gardens = [
  { x: 12, y: 112, width: 46, depth: 16 },
  { x: 128, y: 114, width: 52, depth: 14 },
  { x: 60, y: 12, width: 12, depth: 24 },
];
const columns = [20, 30, 50, 100, 150, 170, 180];
const junctionId = (x: number, y: number) => `junction-${x}-${y}`;
const nodes: WalkingNode[] = [entrance,
  ...[48, 94].flatMap((y) => columns.map((x) => ({ id: junctionId(x, y), name: 'Promenade', x, y }))),
  ...blocks.map((block) => ({ ...block.entrance, id: block.id, name: block.name })),
];
const pairs: [string, string][] = [
  [entrance.id, junctionId(180, 48)],
  ...[48, 94].flatMap((y) => columns.slice(1).map((x, index): [string, string] => [junctionId(columns[index], y), junctionId(x, y)])),
  ...[20, 100, 180].map((x): [string, string] => [junctionId(x, 48), junctionId(x, 94)]),
  ...blocks.map((block): [string, string] => [block.id, junctionId(block.x, block.y > 80 ? 94 : 48)]),
];
export const walkingGraph: WalkingGraph = { nodes, edges: pairs.map(([from, to]) => {
  const a = nodes.find((node) => node.id === from)!;
  const b = nodes.find((node) => node.id === to)!;
  return { from, to, metres: Math.hypot(a.x - b.x, a.y - b.y) };
}) };
