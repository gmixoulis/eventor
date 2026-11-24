import { describe, expect, it } from '@jest/globals';

import { backToFront, mapPoint, project } from '@/components/venue/projection';

describe('venue projection', () => {
  it('keeps the origin at zero', () => {
    expect(project(0, 0)).toEqual({ x: 0, y: 0 });
  });
  it('raises a point vertically without moving its horizontal position', () => {
    const ground = project(20, 30);
    const roof = project(20, 30, 12);
    expect(roof.x).toBe(ground.x);
    expect(ground.y - roof.y).toBeCloseTo(12 * Math.sin(55 * Math.PI / 180));
  });
  it('is top-down at zero tilt and rotation', () => {
    expect(project(20, 30, 12, 0, 0)).toEqual({ x: 20, y: 30 });
    expect(mapPoint({ x: 20, y: 30 }, false, 12)).toEqual({ x: 50, y: 65 });
  });
  it('rotates and foreshortens the ground at the specified angles', () => {
    expect(project(100, 0).x).toBeCloseTo(100 * Math.cos(Math.PI / 6));
    expect(project(100, 0).y).toBeCloseTo(50 * Math.cos(55 * Math.PI / 180));
  });
  it('sorts ground depth back to front without changing the input', () => {
    const near = { x: 100, y: 100 }, far = { x: 10, y: 10 }, middle = { x: 100, y: 20 };
    const items = [near, far, middle];
    expect(backToFront(items)).toEqual([far, middle, near]);
    expect(items).toEqual([near, far, middle]);
  });
});
