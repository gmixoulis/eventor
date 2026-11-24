import { describe, expect, it } from '@jest/globals';

import { classifyTurn, directionSteps, shortestRoute, walkingMinutes } from '@/components/venue/directions';
import { blocks, entrance, venue, walkingGraph, type WalkingGraph } from '@/components/venue/venue-data';

const graph: WalkingGraph = {
  nodes: [
    { id: 'a', name: 'Main entrance', x: 0, y: 30 },
    { id: 'b', name: 'Junction', x: 0, y: 0 },
    { id: 'c', name: 'Long way', x: 70, y: 30 },
    { id: 'd', name: 'Stage', x: 45, y: 0 },
    { id: 'isolated', name: 'Isolated', x: 100, y: 100 },
  ],
  edges: [
    { from: 'a', to: 'b', metres: 30 }, { from: 'b', to: 'd', metres: 45 },
    { from: 'a', to: 'c', metres: 70 }, { from: 'c', to: 'd', metres: 60 },
  ],
};

describe('shortest walking route', () => {
  it('chooses the shorter of two routes and returns segment turns', () => {
    const route = shortestRoute(graph, 'a', 'd')!;
    expect(route.path.map((node) => node.id)).toEqual(['a', 'b', 'd']);
    expect(route.metres).toBe(75);
    expect(route.segments.map((segment) => segment.turn)).toEqual(['straight', 'right']);
  });
  it('walks edges in either direction', () => {
    expect(shortestRoute(graph, 'd', 'a')?.path.map((node) => node.id)).toEqual(['d', 'b', 'a']);
  });
  it('returns undefined for unreachable or unknown endpoints', () => {
    expect(shortestRoute(graph, 'a', 'isolated')).toBeUndefined();
    expect(shortestRoute(graph, 'missing', 'a')).toBeUndefined();
    expect(shortestRoute(graph, 'a', 'missing')).toBeUndefined();
  });
  it('handles start equals destination', () => {
    const route = shortestRoute(graph, 'a', 'a')!;
    expect(route).toEqual({ path: [graph.nodes[0]], metres: 0, segments: [] });
    expect(directionSteps(route, 'Main entrance')[0].text).toBe('You are already there');
  });
});

describe('turn geometry, with south-positive y', () => {
  const a = { x: 0, y: 10 }, b = { x: 0, y: 0 };
  it.each([
    [{ x: -10, y: 0 }, 'left'], [{ x: 10, y: 0 }, 'right'],
    [{ x: 0, y: -10 }, 'straight'], [{ x: -5, y: -10 }, 'slight left'],
    [{ x: 5, y: -10 }, 'slight right'], [{ x: 0, y: 10 }, 'u-turn'],
  ] as const)('classifies %j as %s', (c, expected) => {
    expect(classifyTurn(a, b, c)).toBe(expected);
  });
});

describe('directions text', () => {
  it('generates headings, turns, arrival side and segment ranges for a known path', () => {
    const steps = directionSteps(shortestRoute(graph, 'a', 'd')!, 'Stage', { x: 45, y: -5 });
    expect(steps).toEqual([
      { text: 'Head north from Main entrance for 30 m', icon: 'arrow-up', firstSegment: 0, lastSegment: 0 },
      { text: 'Turn right and continue 45 m', icon: 'arrow-right', firstSegment: 1, lastSegment: 1 },
      { text: 'Stage is on your left', icon: 'flag-checkered', firstSegment: 1, lastSegment: 1 },
    ]);
  });
  it('merges consecutive straight edges into a single instruction', () => {
    const straight: WalkingGraph = {
      nodes: [0, 10, 25].map((x, i) => ({ id: String(i), name: i === 0 ? 'Main entrance' : 'Path', x, y: 0 })),
      edges: [{ from: '0', to: '1', metres: 10 }, { from: '1', to: '2', metres: 15 }],
    };
    expect(directionSteps(shortestRoute(straight, '0', '2')!, 'Lounge')[0]).toEqual({
      text: 'Head east from Main entrance for 25 m', icon: 'arrow-up', firstSegment: 0, lastSegment: 1,
    });
  });
  it('generates slight and U-turn instructions', () => {
    const route = shortestRoute(graph, 'a', 'd')!;
    route.segments[1].turn = 'slight left';
    expect(directionSteps(route, 'Stage')[1].text).toBe('Slight left and continue 45 m');
    route.segments[1].turn = 'u-turn';
    expect(directionSteps(route, 'Stage')[1].text).toBe('Make a U-turn and continue 45 m');
  });
  it.each([[0, 0], [1, 1], [78, 1], [78.01, 2], [120, 2], [156, 2]])('rounds %s metres up to %s minutes', (metres, minutes) => {
    expect(walkingMinutes(metres)).toBe(minutes);
  });
});

describe('original venue schematic', () => {
  it('keeps every block in the assumed venue and every place reachable from every origin', () => {
    expect(blocks).toHaveLength(6);
    for (const block of blocks) {
      expect(block.x - block.width / 2).toBeGreaterThanOrEqual(0);
      expect(block.x + block.width / 2).toBeLessThanOrEqual(venue.width);
      expect(block.y - block.depth / 2).toBeGreaterThanOrEqual(0);
      expect(block.y + block.depth / 2).toBeLessThanOrEqual(venue.depth);
      for (const start of [entrance, ...blocks]) expect(shortestRoute(walkingGraph, start.id, block.id)).toBeDefined();
    }
  });
  it('uses physical edge lengths and never walks through a building footprint', () => {
    for (const edge of walkingGraph.edges) {
      const a = walkingGraph.nodes.find((node) => node.id === edge.from)!;
      const b = walkingGraph.nodes.find((node) => node.id === edge.to)!;
      expect(edge.metres).toBeCloseTo(Math.hypot(a.x - b.x, a.y - b.y));
      for (let i = 1; i < 20; i++) {
        const x = a.x + (b.x - a.x) * i / 20, y = a.y + (b.y - a.y) * i / 20;
        for (const block of blocks) {
          const inside = x > block.x - block.width / 2 && x < block.x + block.width / 2 && y > block.y - block.depth / 2 && y < block.y + block.depth / 2;
          expect(inside).toBe(false);
        }
      }
    }
  });
});
