import type { Point, WalkingEdge, WalkingGraph, WalkingNode } from '@/components/venue/venue-data';
import { EARTH_RADIUS, haversineMetres, RAD, VENUE_CENTER, type LngLat } from '@/lib/geo';

export type PathFeature = {
  type: 'Feature';
  properties: { kind?: 'path'; highway?: string; name?: string };
  geometry: { type: 'LineString'; coordinates: number[][] };
};
export type VenueFeatureCollection = {
  type: 'FeatureCollection';
  features: (PathFeature
    | { type: 'Feature'; properties: { kind: 'building'; name: string; osm: string }; geometry: { type: 'Polygon'; coordinates: number[][][] } }
    | { type: 'Feature'; properties: { kind: 'entrance'; entrance: string; osm: string }; geometry: { type: 'Point'; coordinates: number[] } })[];
};

// Local metres around the venue with y increasing southward, the frame directions.ts expects.
// shortcut: equirectangular projection, accurate to well under 1% within a few km of the venue.
export function toLocal([lng, lat]: LngLat): Point {
  return { x: (lng - VENUE_CENTER[0]) * RAD * EARTH_RADIUS * Math.cos(VENUE_CENTER[1] * RAD),
    y: (VENUE_CENTER[1] - lat) * RAD * EARTH_RADIUS };
}

export function toLngLat({ x, y }: Point): LngLat {
  return [VENUE_CENTER[0] + x / (RAD * EARTH_RADIUS * Math.cos(VENUE_CENTER[1] * RAD)), VENUE_CENTER[1] - y / (RAD * EARTH_RADIUS)];
}

export function isNearVenue(position: LngLat, metres = 1000): boolean {
  return haversineMetres(position, VENUE_CENTER) <= metres;
}

/**
 * Walking graph from path lines: one node per distinct vertex (lines that share a vertex join there),
 * edges between consecutive vertices with haversine lengths. Only the largest connected part is kept,
 * so every snapped start and destination can reach each other.
 */
export function buildGraph(features: PathFeature[]): WalkingGraph {
  const ids = new Map<string, WalkingNode>();
  const edges: WalkingEdge[] = [];
  for (const feature of features) {
    let previous: WalkingNode | undefined;
    for (const [lng, lat] of feature.geometry.coordinates) {
      const key = `${lng.toFixed(7)},${lat.toFixed(7)}`;
      let node = ids.get(key);
      if (!node) {
        node = { id: `n${ids.size}`, name: feature.properties.name ?? 'the path', ...toLocal([lng, lat]) };
        ids.set(key, node);
      }
      if (previous && previous !== node) edges.push({ from: previous.id, to: node.id, metres: haversineMetres(toLngLat(previous), [lng, lat]) });
      previous = node;
    }
  }
  const nodes = [...ids.values()];
  const neighbours = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    neighbours.get(edge.from)!.push(edge.to);
    neighbours.get(edge.to)!.push(edge.from);
  }
  const seen = new Set<string>();
  let largest = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    const part = new Set([node.id]);
    const queue = [node.id];
    while (queue.length) for (const next of neighbours.get(queue.pop()!)!) if (!part.has(next)) { part.add(next); queue.push(next); }
    part.forEach((id) => seen.add(id));
    if (part.size > largest.size) largest = part;
  }
  return { nodes: nodes.filter((node) => largest.has(node.id)), edges: edges.filter((edge) => largest.has(edge.from)) };
}

export function nearestNode(graph: WalkingGraph, point: Point): WalkingNode | undefined {
  let best: WalkingNode | undefined, bestDistance = Infinity;
  for (const node of graph.nodes) {
    const distance = Math.hypot(node.x - point.x, node.y - point.y);
    if (distance < bestDistance) { best = node; bestDistance = distance; }
  }
  return best;
}

/** Adds a point (a place door or the user) to the graph, joined to its nearest path node. */
export function snap(graph: WalkingGraph, node: WalkingNode): WalkingGraph {
  const nearest = nearestNode(graph, node);
  if (!nearest) return { nodes: [node], edges: [] };
  return { nodes: [...graph.nodes, node],
    edges: [...graph.edges, { from: node.id, to: nearest.id, metres: Math.hypot(node.x - nearest.x, node.y - nearest.y) }] };
}
