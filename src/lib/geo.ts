// Geographic helpers shared by venue code and the "near you now" feature.

export type LngLat = [longitude: number, latitude: number];

// Venue centre for the demo map: New York City Hall, Lower Manhattan (replace with your venue).
export const VENUE_CENTER: LngLat = [-74.0059390, 40.7127395];

export const EARTH_RADIUS = 6371008.8;
export const RAD = Math.PI / 180;
const WALK_METRES_PER_SECOND = 1.3;

/** Whole minutes on foot for a distance, at least 1. */
export function walkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / WALK_METRES_PER_SECOND / 60));
}

export function haversineMetres([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLng = (lng2 - lng1) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}
