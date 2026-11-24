import { describe, expect, it } from '@jest/globals';

import { compass, directionSteps, shortestRoute } from '@/components/venue/directions';
import { buildGraph, isNearVenue, nearestNode, snap, toLngLat, toLocal, type PathFeature } from '@/components/venue/geo';
import { haversineMetres, VENUE_CENTER, type LngLat } from '@/lib/geo';
import { realBlocks, realGraph } from '@/components/venue/real-venue';

const line = (...coordinates: LngLat[]): PathFeature =>
  ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
// Two garden paths crossing at a shared vertex, plus a detached stub that must be dropped.
const a: LngLat = [-73.9990, 40.7490], shared: LngLat = [-73.9978, 40.7490], c: LngLat = [-73.9966, 40.7490];
const d: LngLat = [-73.9978, 40.7500], e: LngLat = [-73.9978, 40.7480];

describe('graph from GeoJSON lines', () => {
  const graph = buildGraph([line(a, shared, c), line(d, shared, e), line([-73.9900, 40.7550], [-73.9890, 40.7550])]);

  it('merges shared vertices into one node and keeps only the connected network', () => {
    expect(graph.nodes).toHaveLength(5);
    const junction = nearestNode(graph, toLocal(shared))!;
    expect(graph.edges.filter((edge) => edge.from === junction.id || edge.to === junction.id)).toHaveLength(4);
  });
  it('measures edges within 1% of the haversine distance', () => {
    const [edge] = buildGraph([line(a, shared)]).edges;
    const expected = haversineMetres(a, shared);
    expect(expected).toBeGreaterThan(85);
    expect(Math.abs(edge.metres - expected) / expected).toBeLessThan(0.01);
    expect(Math.abs(Math.hypot(toLocal(a).x - toLocal(shared).x, toLocal(a).y - toLocal(shared).y) - expected) / expected).toBeLessThan(0.01);
  });
  it('snaps a point to the nearest node and routes between two known nodes', () => {
    const start = nearestNode(graph, toLocal([-73.99899, 40.74901]))!;
    const end = nearestNode(graph, toLocal(d))!;
    expect(toLngLat(start)[0]).toBeCloseTo(a[0], 6);
    const route = shortestRoute(graph, start.id, end.id)!;
    expect(route.path).toHaveLength(3);
    expect(route.metres).toBeCloseTo(haversineMetres(a, shared) + haversineMetres(shared, d), 0);
    expect(directionSteps(route, 'Stage')[0].text).toMatch(/^Head east/);
    expect(route.segments[1].turn).toBe('left');
  });
  it('joins a snapped point to its nearest node', () => {
    const withMe = snap(graph, { id: 'me', name: 'your location', ...toLocal([-73.9965, 40.7491]) });
    expect(withMe.edges.at(-1)).toMatchObject({ from: 'me', to: nearestNode(graph, toLocal(c))!.id });
  });
});

describe('compass text', () => {
  it.each([[0, 'north'], [44, 'northeast'], [90, 'east'], [181, 'south'], [270, 'west'], [338, 'north'], [-45, 'northwest']])('%s degrees is %s', (deg, text) => {
    expect(compass(deg)).toBe(text);
  });
});

describe('within 1 km of the venue', () => {
  it('accepts points inside the radius and rejects points beyond it', () => {
    expect(isNearVenue(VENUE_CENTER)).toBe(true);
    expect(isNearVenue([VENUE_CENTER[0], VENUE_CENTER[1] + 0.0085])).toBe(true); // about 945 m north
    expect(isNearVenue([VENUE_CENTER[0], VENUE_CENTER[1] + 0.0095])).toBe(false); // about 1056 m north
  });
});

describe('bundled OpenStreetMap venue', () => {
  it('reaches every festival place from the main entrance and from each other', () => {
    expect(realGraph.nodes.length).toBeGreaterThan(5);
    for (const from of ['entrance', ...realBlocks.map((block) => block.id)]) {
      for (const block of realBlocks) expect(shortestRoute(realGraph, from, block.id)).toBeDefined();
    }
  });
});
