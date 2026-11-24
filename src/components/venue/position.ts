import { bearing, type DirectionStep } from '@/components/venue/directions';
import type { LngLat } from '@/lib/geo';
import { accuracyLabel, type Fix } from '@/components/venue/location-fix';
import type { Point } from '@/components/venue/venue-data';

export type PositionSource = 'gps' | 'manual' | 'checkpoint' | 'simulated';
export type Position = Fix & { source: PositionSource; label?: string; heading?: number };
/** A position the person set themselves; it wins over GPS until cleared. */
export type PositionOverride = { source: 'manual' | 'checkpoint'; lngLat: LngLat; label: string; timestamp: number; placeId?: string };

export const GPS_GOOD_AGAIN_METRES = 15;
export const SIMULATED_ACCURACY_METRES = 6;

/** The one place that decides where "you" are. Priority: demo simulation, then a position the user set, then GPS. */
export function resolvePosition({ gps, gpsHeading, override, simulated }: {
  gps?: Fix; gpsHeading?: number; override?: PositionOverride; simulated?: Fix & { heading?: number };
}): Position | undefined {
  if (simulated) return { ...simulated, source: 'simulated' };
  if (override) return { lngLat: override.lngLat, accuracy: null, timestamp: override.timestamp, source: override.source, label: override.label };
  return gps ? { ...gps, source: 'gps', heading: gpsHeading } : undefined;
}

export function positionReadout(position: Position | undefined, gpsOn: boolean, noFix = false): { text: string; low: boolean; simulated: boolean } {
  if (noFix && (!position || position.source === 'gps')) return { text: 'No GPS fix yet', low: true, simulated: false };
  if (!position) return { text: gpsOn ? 'Finding your location' : 'Set your position', low: false, simulated: false };
  if (position.source === 'manual') return { text: `Position set by you, at ${position.label}`, low: false, simulated: false };
  if (position.source === 'checkpoint') return { text: `Position set by checkpoint, at ${position.label}`, low: false, simulated: false };
  return { ...accuracyLabel(position), simulated: position.source === 'simulated' };
}

/** True when GPS is good enough to offer switching back from a position the user set. */
export function gpsAccurateAgain(gps?: Fix): boolean {
  return gps !== undefined && gps.accuracy !== null && gps.accuracy < GPS_GOOD_AGAIN_METRES;
}

export function formatPosition(position: Fix): string {
  const [lng, lat] = position.lngLat;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}${position.accuracy === null ? '' : ` (±${Math.round(position.accuracy)} m)`}`;
}

/**
 * Where a walker is after `distance` metres along `path` (venue frame, metres). Zero-length segments are
 * skipped for the bearing; past the end the walker stays on the last vertex with `done` set.
 */
export function walkAlong(path: Point[], distance: number): { point: Point; bearing: number; segment: number; done: boolean } {
  let left = Math.max(0, distance), facing = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    facing = bearing(a, b);
    if (left < length) return { point: { x: a.x + (b.x - a.x) * left / length, y: a.y + (b.y - a.y) * left / length }, bearing: facing, segment: i, done: false };
    left -= length;
  }
  return { point: path[path.length - 1] ?? { x: 0, y: 0 }, bearing: facing, segment: Math.max(0, path.length - 2), done: true };
}

/** The direction step being walked on `segment`; the arrival step once the walk is done. */
export function stepAt(steps: DirectionStep[], segment: number, done: boolean): number {
  if (done) return steps.length - 1;
  const index = steps.findIndex((step) => segment >= step.firstSegment && segment <= step.lastSegment);
  return index < 0 ? 0 : index;
}

/** Metres from the route start to the end of the step that contains `distance` (reduced motion jumps there). */
export function nextStepEnd(path: Point[], steps: DirectionStep[], distance: number): number {
  const { segment, done } = walkAlong(path, distance);
  if (done) return distance;
  const last = steps[stepAt(steps, segment, false)].lastSegment;
  let total = 0;
  for (let i = 0; i <= last; i++) total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
  return total;
}
