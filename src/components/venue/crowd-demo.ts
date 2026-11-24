/**
 * Simulated crowd levels for the demo, so the full experience can be shown without a live feed.
 * This is NOT real occupancy. A real source would replace crowdLevel(); every screen reads only this
 * resolver, so swapping in live data needs no UI change. Crowd is separate from ticket availability:
 * 'high' means crowded or near capacity, never "sold out".
 */
export type CrowdLevel = 'low' | 'medium' | 'high';

// place-hudson is the main stage: the busiest hall in the demo (the "Hall 1 is red" case).
const LEVELS: Record<string, CrowdLevel> = {
  'place-hudson': 'high',
  'place-chelsea': 'medium',
  'place-cinema': 'low',
  'place-networking': 'medium',
  'place-chill': 'low',
};

export const CROWD_META: Record<CrowdLevel, { word: string; caption: string }> = {
  low: { word: 'Low', caption: 'Not busy' },
  medium: { word: 'Medium', caption: 'Filling up' },
  high: { word: 'High', caption: 'Crowded' },
};

export const CROWD_LEVELS: CrowdLevel[] = ['low', 'medium', 'high'];

/** Shown wherever a crowd level appears, so no one mistakes the demo for a live reading. */
export const CROWD_DEMO_NOTE = 'Simulated demo data, not live occupancy.';

export function crowdLevel(placeId: string): CrowdLevel | null {
  return LEVELS[placeId] ?? null;
}
