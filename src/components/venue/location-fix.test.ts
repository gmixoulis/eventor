import { describe, expect, it } from '@jest/globals';

import { accuracyLabel, accuracyRadius, metresToPixels, toggleLocate, type Fix } from '@/components/venue/location-fix';

const fix = (accuracy: number | null): Fix => ({ lngLat: [23.7363, 37.9715], accuracy, timestamp: 0 });

describe('accuracy readout', () => {
  it.each([
    [8, 'Accurate to about 8 m', false],
    [30, 'Accurate to about 30 m', false],
    [30.4, 'Low accuracy, common indoors (about 30 m)', true],
    [65, 'Low accuracy, common indoors (about 65 m)', true],
    [0.2, 'Accurate to about 1 m', false],
  ] as const)('%s m reads "%s"', (metres, text, low) => {
    expect(accuracyLabel(fix(metres))).toEqual({ text, low });
  });
  it('waits for a fix and flags an unknown accuracy', () => {
    expect(accuracyLabel(undefined)).toEqual({ text: 'Finding your location', low: false });
    expect(accuracyLabel(fix(null)).low).toBe(true);
  });
});

describe('accuracy circle size', () => {
  it('matches the 512 px tile scale at the equator and shrinks with cos(latitude)', () => {
    // Zoom 0 at the equator: 40075016.686 m across 512 px, about 78271.5 m per pixel.
    expect(metresToPixels(78271.517, 0, 0)).toBeCloseTo(1, 4);
    expect(metresToPixels(10, 0, 17)).toBeCloseTo(10 / (78271.517 / 2 ** 17), 3);
    // At New York (about 38 degrees north) one pixel covers fewer metres, so the circle is larger.
    expect(metresToPixels(10, 37.9715, 17)).toBeCloseTo(10 / (78271.517 * Math.cos(37.9715 * Math.PI / 180) / 2 ** 17), 3);
  });
  it('doubles per zoom level and builds an exponential base-2 expression', () => {
    expect(metresToPixels(8, 38, 18) / metresToPixels(8, 38, 17)).toBeCloseTo(2, 10);
    const expression = accuracyRadius(8, 38);
    expect(expression.slice(0, 3)).toEqual(['interpolate', ['exponential', 2], ['zoom']]);
    expect(expression[6]).toBeCloseTo(metresToPixels(8, 38, 22), 6);
  });
});

describe('locate me toggle', () => {
  it('follows the user on the first tap and returns to the venue on the second', () => {
    const first = toggleLocate(false, true);
    expect(first).toEqual({ following: true, target: 'user' });
    expect(toggleLocate(first.following, true)).toEqual({ following: false, target: 'venue' });
  });
  it('centres on the venue when there is no fix yet', () => {
    expect(toggleLocate(false, false)).toEqual({ following: false, target: 'venue' });
  });
});
