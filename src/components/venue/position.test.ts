import { describe, expect, it } from '@jest/globals';

import { encodeCheckpoint, parseCheckpoint } from '@/components/venue/checkpoint';
import type { DirectionStep } from '@/components/venue/directions';
import type { Fix } from '@/components/venue/location-fix';
import { formatPosition, gpsAccurateAgain, nextStepEnd, positionReadout, resolvePosition, stepAt, walkAlong, type PositionOverride } from '@/components/venue/position';

const gps: Fix = { lngLat: [23.7363, 37.97152], accuracy: 8, timestamp: 1 };
const override: PositionOverride = { source: 'manual', lngLat: [23.7, 37.9], label: 'Megaron Stage', timestamp: 2 };
const simulated = { lngLat: [23.735, 37.971] as [number, number], accuracy: 6, timestamp: 3, heading: 90 };

describe('position resolver', () => {
  it('prefers simulation, then a position the user set, then GPS', () => {
    expect(resolvePosition({ gps, override, simulated })?.source).toBe('simulated');
    expect(resolvePosition({ gps, override })).toEqual({ lngLat: [23.7, 37.9], accuracy: null, timestamp: 2, source: 'manual', label: 'Megaron Stage' });
    expect(resolvePosition({ gps, gpsHeading: 45 })).toEqual({ ...gps, source: 'gps', heading: 45 });
    expect(resolvePosition({})).toBeUndefined();
  });
  it('labels each source for the readout', () => {
    expect(positionReadout(resolvePosition({ override }), true).text).toBe('Position set by you, at Megaron Stage');
    expect(positionReadout(resolvePosition({ override: { ...override, source: 'checkpoint' } }), true).text).toBe('Position set by checkpoint, at Megaron Stage');
    expect(positionReadout(resolvePosition({ simulated }), true)).toEqual({ text: 'Accurate to about 6 m', low: false, simulated: true });
    expect(positionReadout(resolvePosition({ gps }), true)).toEqual({ text: 'Accurate to about 8 m', low: false, simulated: false });
    expect(positionReadout(undefined, true).text).toBe('Finding your location');
    expect(positionReadout(undefined, false).text).toBe('Set your position');
  });
  it('offers GPS again only below 15 m', () => {
    expect(gpsAccurateAgain({ ...gps, accuracy: 14.9 })).toBe(true);
    expect(gpsAccurateAgain({ ...gps, accuracy: 15 })).toBe(false);
    expect(gpsAccurateAgain({ ...gps, accuracy: null })).toBe(false);
    expect(gpsAccurateAgain(undefined)).toBe(false);
  });
  it('formats coordinates for copying', () => {
    expect(formatPosition(gps)).toBe('37.97152, 23.73630 (±8 m)');
    expect(formatPosition({ ...gps, accuracy: null })).toBe('37.97152, 23.73630');
  });
});

describe('checkpoint QR payload', () => {
  const ids = ['place-chelsea', 'place-cinema'];
  it('round-trips a known place', () => {
    expect(encodeCheckpoint('place-chelsea')).toBe('{"v":1,"kind":"checkpoint","placeId":"place-chelsea"}');
    expect(parseCheckpoint(encodeCheckpoint('place-cinema'), ids)).toBe('place-cinema');
  });
  it.each([
    ['not json'], ['null'], ['[]'], ['"text"'],
    ['{"v":2,"kind":"checkpoint","placeId":"place-chelsea"}'],
    ['{"v":1,"kind":"lead","placeId":"place-chelsea"}'],
    ['{"v":1,"kind":"checkpoint","placeId":"place-unknown"}'],
    ['{"v":1,"kind":"checkpoint","placeId":7}'],
    ['{"v":1,"kind":"checkpoint"}'],
    ['{"v":1,"kind":"checkpoint","placeId":"place-chelsea","extra":true}'],
    ['{"v":1,"id":"u1","name":"A","title":"","company":""}'],
  ])('rejects %s', (data) => {
    expect(parseCheckpoint(data, ids)).toBeNull();
  });
});

describe('walking along a route', () => {
  // East 10 m, a zero-length segment, then north 20 m (y grows southward).
  const path = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: -20 }];
  const steps: DirectionStep[] = [
    { text: 'Head east', icon: 'arrow-up', firstSegment: 0, lastSegment: 1 },
    { text: 'Turn left', icon: 'arrow-left', firstSegment: 2, lastSegment: 2 },
    { text: 'Arrive', icon: 'flag-checkered', firstSegment: 2, lastSegment: 2 },
  ];
  it('starts on the first vertex facing the first segment', () => {
    expect(walkAlong(path, 0)).toEqual({ point: { x: 0, y: 0 }, bearing: 90, segment: 0, done: false });
    expect(walkAlong(path, -5).point).toEqual({ x: 0, y: 0 });
  });
  it('interpolates in the middle of a segment', () => {
    expect(walkAlong(path, 4)).toEqual({ point: { x: 4, y: 0 }, bearing: 90, segment: 0, done: false });
  });
  it('moves onto the next real segment exactly at a vertex, skipping the zero-length one', () => {
    const at = walkAlong(path, 10);
    expect(at).toEqual({ point: { x: 10, y: 0 }, bearing: 0, segment: 2, done: false });
    expect(stepAt(steps, at.segment, at.done)).toBe(1);
  });
  it('stops at the end of the route', () => {
    const end = walkAlong(path, 30);
    expect(end).toEqual({ point: { x: 10, y: -20 }, bearing: 0, segment: 2, done: true });
    expect(walkAlong(path, 99).done).toBe(true);
    expect(stepAt(steps, end.segment, end.done)).toBe(2);
  });
  it('handles a route that is a single point', () => {
    expect(walkAlong([{ x: 3, y: 4 }], 5)).toEqual({ point: { x: 3, y: 4 }, bearing: 0, segment: 0, done: true });
  });
  it('jumps to the end of the current step for reduced motion', () => {
    expect(nextStepEnd(path, steps, 2)).toBe(10);
    expect(nextStepEnd(path, steps, 10)).toBe(30);
    expect(nextStepEnd(path, steps, 30)).toBe(30);
  });
});
