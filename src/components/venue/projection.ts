import type { Point } from '@/components/venue/venue-data';

export function project(x: number, y: number, z = 0, tilt = 55, rotation = 30): Point {
  const t = tilt * Math.PI / 180;
  const r = rotation * Math.PI / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r),
    y: (x * Math.sin(r) + y * Math.cos(r)) * Math.cos(t) - z * Math.sin(t) };
}

export function mapPoint(point: Point, is3D: boolean, height = 0): Point {
  const projected = project(point.x, point.y, height, is3D ? 55 : 0, is3D ? 30 : 0);
  return { x: projected.x + (is3D ? 80 : 30), y: projected.y + (is3D ? 30 : 35) };
}

export function backToFront<T extends Point>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => project(a.x, a.y).y - project(b.x, b.y).y);
}
