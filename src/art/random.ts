// Deterministic randomness for generated artwork. Never Math.random: the same input must draw the same piece.
import { hashString } from '@/lib/utils';

/** mulberry32: a small seeded generator returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seeded(seed: string): () => number {
  return mulberry32(hashString(seed));
}

export type Point = { x: number; y: number };

/** Number formatting for SVG path data: two decimals, no trailing noise. */
export function n2(value: number): string {
  return String(Math.round(value * 100) / 100);
}
