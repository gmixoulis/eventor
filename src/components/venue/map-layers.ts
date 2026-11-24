import type { CircleLayerSpecification, FilterSpecification } from '@maplibre/maplibre-react-native';

import { toLngLat } from '@/components/venue/geo';
import type { Position, PositionSource } from '@/components/venue/position';
import { realBlocks } from '@/components/venue/real-venue';
import type { Theme } from '@/constants/theme';

// Everything here is drawn by the map engine (GeoJSON source + style layer), never by React Native views:
// views over the map are repositioned a frame late and drift while the map is dragged.

type Colors = Theme['colors'];
type Paint = NonNullable<CircleLayerSpecification['paint']>;
export type PinProperties = { id: string; name: string; category: string; visited: boolean; bookmarked: boolean; selected: boolean };

export function pinCollection(places: { id: string; name: string }[], visited: string[], bookmarked: string[], selectedId?: string) {
  return {
    type: 'FeatureCollection' as const,
    features: places.flatMap((place) => {
      const block = realBlocks.find((b) => b.id === place.id);
      if (!block) return [];
      const properties: PinProperties = { id: place.id, name: place.name, category: block.category,
        visited: visited.includes(place.id), bookmarked: bookmarked.includes(place.id), selected: place.id === selectedId };
      return [{ type: 'Feature' as const, id: place.id, properties, geometry: { type: 'Point' as const, coordinates: toLngLat(block) } }];
    }),
  };
}

/** Pin, visited dot and bookmark badge: data-driven circles with a constant screen size (viewport pitch alignment). */
export function pinPaint(colors: Colors): { pin: Paint; visited: Paint; bookmark: Paint } {
  const flat = { 'circle-pitch-alignment': 'viewport', 'circle-pitch-scale': 'viewport' } as const;
  return {
    pin: { ...flat, 'circle-radius': ['case', ['get', 'selected'], 14, 11],
      'circle-color': ['case', ['get', 'selected'], colors.accent, colors.primary],
      'circle-stroke-color': colors.onPrimary, 'circle-stroke-width': ['case', ['get', 'selected'], 3, 2.5] },
    // A filled centre dot reads as "done" without needing an icon image.
    visited: { ...flat, 'circle-radius': 4.5, 'circle-color': colors.onPrimary },
    bookmark: { ...flat, 'circle-radius': 5, 'circle-color': colors.accent, 'circle-stroke-color': colors.onPrimary,
      'circle-stroke-width': 1.5, 'circle-translate': [10, -10], 'circle-translate-anchor': 'viewport' },
  };
}

export const visitedFilter: FilterSpecification = ['==', ['get', 'visited'], true];
export const bookmarkFilter: FilterSpecification = ['==', ['get', 'bookmarked'], true];
export const setByUserFilter: FilterSpecification = ['in', ['get', 'source'], ['literal', ['manual', 'checkpoint']]];

/** The first pressed feature that is a known place, from a source press event's features. */
export function placeIdFromPress(features: { properties?: Record<string, unknown> | null }[], placeIds: readonly string[]): string | undefined {
  for (const feature of features) {
    const id = feature.properties?.id;
    if (typeof id === 'string' && placeIds.includes(id)) return id;
  }
  return undefined;
}

export function puckCollection(position?: Position) {
  return { type: 'FeatureCollection' as const, features: position ? [{ type: 'Feature' as const,
    properties: { source: position.source },
    geometry: { type: 'Point' as const, coordinates: position.lngLat } }] : [] };
}

/** Ring colour by position source: set by the person (accent), simulated (warning), GPS (white). */
export function puckPaint(colors: Colors): { dot: Paint; badge: Paint } {
  const ring = (source: PositionSource) => source === 'simulated' ? colors.warning : colors.accent;
  return {
    dot: { 'circle-radius': 8, 'circle-color': colors.primary, 'circle-stroke-width': 3,
      'circle-stroke-color': ['match', ['get', 'source'], 'manual', ring('manual'), 'checkpoint', ring('checkpoint'), 'simulated', ring('simulated'), colors.card],
      'circle-pitch-alignment': 'viewport' },
    badge: { 'circle-radius': 4, 'circle-color': colors.accent, 'circle-stroke-color': colors.card, 'circle-stroke-width': 1,
      'circle-translate': [8, -8], 'circle-translate-anchor': 'viewport', 'circle-pitch-alignment': 'viewport' },
  };
}

/**
 * Heading nub: a small dot 14 px from the puck centre in the heading direction. Translate anchored to the
 * map rotates with the map, so a compass heading stays true while the map is rotated.
 */
export function headingTranslate(heading: number, distance = 14): [number, number] {
  const radians = heading * Math.PI / 180;
  const round = (value: number) => Math.round(value * 100) / 100 + 0; // + 0 turns -0 into 0
  return [round(Math.sin(radians) * distance), round(-Math.cos(radians) * distance)];
}
