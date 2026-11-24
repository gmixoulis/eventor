import type { CircleLayerSpecification } from '@maplibre/maplibre-react-native';

import type { LngLat } from '@/lib/geo';

/** ageMinutes is set only for a cached (last known) position older than two minutes. */
export type Fix = { lngLat: LngLat; accuracy: number | null; timestamp: number; ageMinutes?: number };

export const LOW_ACCURACY_METRES = 30;

export function accuracyLabel(fix: Fix | undefined): { text: string; low: boolean } {
  if (!fix) return { text: 'Finding your location', low: false };
  if (fix.ageMinutes !== undefined) return { text: `Last known position, ${fix.ageMinutes} min old`, low: true };
  if (fix.accuracy === null) return { text: 'Accuracy unknown', low: true };
  if (fix.accuracy > LOW_ACCURACY_METRES) return { text: `Low accuracy, common indoors (about ${Math.round(fix.accuracy)} m)`, low: true };
  return { text: `Accurate to about ${Math.max(1, Math.round(fix.accuracy))} m`, low: false };
}

// MapLibre renders 512 px tiles: the world is 512 * 2^zoom pixels wide at the equator.
const EARTH_CIRCUMFERENCE = 40075016.686;
export function metresToPixels(metres: number, latitude: number, zoom: number): number {
  return metres / (EARTH_CIRCUMFERENCE * Math.cos(latitude * Math.PI / 180) / (512 * 2 ** zoom));
}

type CircleRadius = Extract<NonNullable<CircleLayerSpecification['paint']>['circle-radius'], unknown[]>;

/** circle-radius expression: pixels double per zoom level, so an exponential base-2 ramp between two stops is exact. */
export function accuracyRadius(metres: number, latitude: number): CircleRadius {
  return ['interpolate', ['exponential', 2], ['zoom'], 0, metresToPixels(metres, latitude, 0), 22, metresToPixels(metres, latitude, 22)];
}

/** "Locate me": first tap follows the user (when there is a fix), the next tap returns to the venue. */
export function toggleLocate(following: boolean, hasFix: boolean): { following: boolean; target: 'user' | 'venue' } {
  return !following && hasFix ? { following: true, target: 'user' } : { following: false, target: 'venue' };
}
