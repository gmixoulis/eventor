import { describe, expect, it } from '@jest/globals';

import { clampMap } from '@/components/venue/math';

describe('clampMap', () => {
  it('bounds scale to 1 through 4', () => {
    expect(clampMap(0.2, 0, 0, 360, 260).scale).toBe(1);
    expect(clampMap(8, 0, 0, 360, 260).scale).toBe(4);
  });

  it('centers the image at scale 1', () => {
    expect(clampMap(1, 900, -900, 360, 260)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('limits both pan directions at scale 4', () => {
    expect(clampMap(4, 900, -900, 360, 260)).toEqual({ scale: 4, x: 540, y: -390 });
    expect(clampMap(4, -900, 900, 360, 260)).toEqual({ scale: 4, x: -540, y: 390 });
  });

  it('uses the viewport bounds and preserves valid positions', () => {
    expect(clampMap(1, 50, 50, 360, 260, 360, 600)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(clampMap(4, 50, 900, 360, 260, 360, 600)).toEqual({ scale: 4, x: 50, y: 220 });
    expect(clampMap(2, 25, -10, 360, 260)).toEqual({ scale: 2, x: 25, y: -10 });
  });
});
