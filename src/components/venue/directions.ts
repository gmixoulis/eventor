import type { Point, WalkingGraph, WalkingNode } from '@/components/venue/venue-data';

export type Turn = 'straight' | 'slight left' | 'slight right' | 'left' | 'right' | 'u-turn';
export type RouteSegment = { from: WalkingNode; to: WalkingNode; metres: number; turn: Turn };
export type WalkingRoute = { path: WalkingNode[]; metres: number; segments: RouteSegment[] };
export type DirectionStep = {
  text: string; icon: 'arrow-up' | 'arrow-left' | 'arrow-right' | 'flag-checkered';
  firstSegment: number; lastSegment: number;
};

/** The route nodes to frame: the current step's segments, or the whole route before the first step. */
export function focusedPath(route: WalkingRoute, step?: DirectionStep): WalkingNode[] {
  return step && step.firstSegment >= 0 ? route.path.slice(step.firstSegment, step.lastSegment + 2) : route.path;
}

// Venue y increases southward, so a positive cross product is a right turn.
export function classifyTurn(a: Point, b: Point, c: Point): Turn {
  const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - b.x, vy = c.y - b.y;
  const angle = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy) * 180 / Math.PI;
  const magnitude = Math.abs(angle);
  if (magnitude < 15) return 'straight';
  if (magnitude >= 150) return 'u-turn';
  if (magnitude < 60) return angle < 0 ? 'slight left' : 'slight right';
  return angle < 0 ? 'left' : 'right';
}

export function shortestRoute(graph: WalkingGraph, start: string, end: string): WalkingRoute | undefined {
  if (!graph.nodes.some((n) => n.id === start) || !graph.nodes.some((n) => n.id === end)) return undefined;
  const distance = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, { id: string; metres: number }>();
  const pending = new Set(graph.nodes.map((n) => n.id));
  const adjacent = new Map<string, { id: string; metres: number }[]>();
  for (const edge of graph.edges) {
    if (!Number.isFinite(edge.metres) || edge.metres < 0) continue;
    adjacent.set(edge.from, [...adjacent.get(edge.from) ?? [], { id: edge.to, metres: edge.metres }]);
    adjacent.set(edge.to, [...adjacent.get(edge.to) ?? [], { id: edge.from, metres: edge.metres }]);
  }
  while (pending.size) {
    let current: string | undefined;
    let best = Infinity;
    for (const id of pending) {
      const value = distance.get(id) ?? Infinity;
      if (value < best) { best = value; current = id; }
    }
    if (current === undefined) return undefined;
    if (current === end) break;
    pending.delete(current);
    for (const { id: next, metres } of adjacent.get(current) ?? []) {
      if (!pending.has(next)) continue;
      const candidate = best + metres;
      if (candidate < (distance.get(next) ?? Infinity)) {
        distance.set(next, candidate);
        previous.set(next, { id: current, metres });
      }
    }
  }
  const ids = [end];
  while (ids[0] !== start) {
    const parent = previous.get(ids[0]);
    if (!parent) return undefined;
    ids.unshift(parent.id);
  }
  const path = ids.map((id) => graph.nodes.find((n) => n.id === id)!);
  const segments = path.slice(1).map((to, index): RouteSegment => ({
    from: path[index], to, metres: previous.get(to.id)!.metres,
    turn: index === 0 ? 'straight' : classifyTurn(path[index - 1], path[index], to),
  }));
  return { path, metres: distance.get(end) ?? 0, segments };
}

/** Compass bearing in degrees clockwise from north, in the south-positive venue frame. */
export function bearing(from: Point, to: Point): number {
  return (Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI + 360) % 360;
}

export function compass(degrees: number): string {
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round((degrees % 360 + 360) % 360 / 45) % 8];
}

export function walkingMinutes(metres: number): number {
  return Math.ceil(metres / 1.3 / 60);
}

export function directionSteps(route: WalkingRoute, destination: string, destinationCenter?: Point): DirectionStep[] {
  if (!route.segments.length) return [{ text: 'You are already there', icon: 'flag-checkered', firstSegment: -1, lastSegment: -1 }];
  const steps: DirectionStep[] = [];
  for (let i = 0; i < route.segments.length; i++) {
    const first = i;
    const segment = route.segments[i];
    let metres = segment.metres;
    while (i + 1 < route.segments.length && route.segments[i + 1].turn === 'straight') {
      i++;
      metres += route.segments[i].metres;
    }
    const length = Math.round(metres);
    const turn = segment.turn;
    const heading = compass(bearing(segment.from, segment.to));
    const instruction = turn === 'straight' ? 'Continue straight' : turn === 'u-turn' ? 'Make a U-turn and continue' : turn.startsWith('slight') ? `Slight ${turn.slice(7)} and continue` : `Turn ${turn} and continue`;
    steps.push({ text: first === 0 ? `Head ${heading} from ${segment.from.name} for ${length} m` : `${instruction} ${length} m`,
      icon: turn.includes('left') || turn === 'u-turn' ? 'arrow-left' : turn.includes('right') ? 'arrow-right' : 'arrow-up',
      firstSegment: first, lastSegment: i });
  }
  const last = route.segments[route.segments.length - 1];
  const side = destinationCenter ? classifyTurn(last.from, last.to, destinationCenter) : 'straight';
  steps.push({ text: side.includes('left') ? `${destination} is on your left` : side.includes('right') ? `${destination} is on your right` : `Arrive at ${destination}`,
    icon: 'flag-checkered', firstSegment: route.segments.length - 1, lastSegment: route.segments.length - 1 });
  return steps;
}
