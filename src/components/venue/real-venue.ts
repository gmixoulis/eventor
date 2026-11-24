import { buildGraph, snap, toLngLat, toLocal, type PathFeature } from '@/components/venue/geo';
import type { LngLat } from '@/lib/geo';
import { osmVenue } from '@/components/venue/osm-venue';
import { blocks as schematicBlocks, type VenueBlock, type WalkingGraph, type WalkingNode } from '@/components/venue/venue-data';

/**
 * APPROXIMATE: the organizer has not supplied a floor plan, so these are guesses placed on or beside the
 * real demo footprint, in metres east (x) and south (y) of VENUE_CENTER. Only the the main stage
 * sits on a real feature (the circular open-air courtyard). Replace with surveyed points when available.
 * `indoor` places are reached through the main entrance rather than from the nearest garden path.
 */
export const APPROXIMATE_PLACE_POSITIONS: Record<string, { x: number; y: number; indoor: boolean }> = {
  'place-hudson': { x: 37, y: 0, indoor: true }, // an indoor hall
  'place-chelsea': { x: -12, y: -4, indoor: true }, // west wing
  'place-cinema': { x: 80, y: -12, indoor: true }, // east wing
  'place-networking': { x: 40, y: 24, indoor: true }, // south hall
  'place-chill': { x: -44, y: -8, indoor: false }, // garden west of the building
  'place-registration': { x: 12, y: 44, indoor: false }, // outside the main entrance
};

const paths = osmVenue.features.filter((feature): feature is PathFeature => feature.properties.kind === 'path');
const building = osmVenue.features.find((feature) => feature.properties.kind === 'building')!;
// The only OSM-tagged door on the demo footprint (node 14007767788); it is tagged entrance=yes, not main.
const door = osmVenue.features.find((feature) => feature.properties.kind === 'entrance' && feature.properties.osm === 'node/14007767788')!;

export const realEntrance: WalkingNode = { id: 'entrance', name: 'Main entrance', ...toLocal(door.geometry.coordinates as LngLat) };

export const realBlocks: VenueBlock[] = schematicBlocks.map((block) => {
  const at = APPROXIMATE_PLACE_POSITIONS[block.id] ?? { x: 0, y: 0 };
  // shortcut: heights only need to rise above the base map's building extrusion, not match real rooms.
  return { ...block, x: at.x, y: at.y, entrance: at, width: block.width / 2, depth: block.depth / 2,
    height: block.category === 'stage' ? 14 : 9 };
});

let graph: WalkingGraph = snap(buildGraph(paths), realEntrance);
for (const block of realBlocks) {
  const node: WalkingNode = { id: block.id, name: block.name, x: block.x, y: block.y };
  graph = APPROXIMATE_PLACE_POSITIONS[block.id]?.indoor
    ? { nodes: [...graph.nodes, node], edges: [...graph.edges,
      { from: node.id, to: realEntrance.id, metres: Math.hypot(node.x - realEntrance.x, node.y - realEntrance.y) }] }
    : snap(graph, node);
}
export const realGraph = graph;

export const blockShapes = {
  type: 'FeatureCollection' as const,
  features: realBlocks.map((block) => {
    const w = block.width / 2, d = block.depth / 2;
    const ring = [[-w, -d], [w, -d], [w, d], [-w, d], [-w, -d]].map(([dx, dy]) => toLngLat({ x: block.x + dx, y: block.y + dy }));
    return { type: 'Feature' as const, id: block.id,
      properties: { id: block.id, name: block.name, height: block.height, category: block.category },
      geometry: { type: 'Polygon' as const, coordinates: [ring] } };
  }),
};
export const pathShapes = { type: 'FeatureCollection' as const, features: paths };
export const footprint = building;
