import { describe, expect, it } from '@jest/globals';

import { haversineMetres, VENUE_CENTER, walkMinutes, type LngLat } from '@/lib/geo';

describe('walkMinutes', () => {
  it('is at least one minute, even for zero or negative distance', () => {
    expect(walkMinutes(0)).toBe(1);
    expect(walkMinutes(10)).toBe(1);
    expect(walkMinutes(-500)).toBe(1);
  });

  it('rounds to whole minutes at 1.3 m/s (78 m per minute)', () => {
    expect(walkMinutes(78 * 5)).toBe(5);
    expect(walkMinutes(78 * 5 + 38)).toBe(5);
    expect(walkMinutes(78 * 5 + 40)).toBe(6);
    expect(walkMinutes(1000)).toBe(13);
  });
});

describe('haversineMetres', () => {
  it('is zero for the same point and symmetric', () => {
    const other: LngLat = [VENUE_CENTER[0] + 0.01, VENUE_CENTER[1] - 0.02];
    expect(haversineMetres(VENUE_CENTER, VENUE_CENTER)).toBe(0);
    expect(haversineMetres(VENUE_CENTER, other)).toBeCloseTo(haversineMetres(other, VENUE_CENTER), 6);
  });

  it('measures one degree of latitude as about 111.2 km', () => {
    expect(haversineMetres([0, 0], [0, 1])).toBeCloseTo(111195, -1);
  });

  it('shrinks a degree of longitude with latitude', () => {
    const equator = haversineMetres([0, 0], [1, 0]);
    const nyc = haversineMetres([0, 40.71], [1, 40.71]);
    expect(equator).toBeCloseTo(111195, -1);
    expect(nyc / equator).toBeCloseTo(Math.cos((40.71 * Math.PI) / 180), 3);
  });

  it('handles antipodal points without NaN', () => {
    const d = haversineMetres([0, 0], [180, 0]);
    expect(Number.isNaN(d)).toBe(false);
    expect(d).toBeCloseTo(Math.PI * 6371008.8, -1);
  });
});
