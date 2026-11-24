import { describe, expect, it } from '@jest/globals';

import { toLngLat } from '@/components/venue/geo';
import { bookmarkFilter, headingTranslate, pinCollection, pinPaint, placeIdFromPress, puckCollection, puckPaint, setByUserFilter, visitedFilter } from '@/components/venue/map-layers';
import { realBlocks } from '@/components/venue/real-venue';
import { themes } from '@/constants/theme';
import { listPlaces } from '@/data';

const places = listPlaces();
const colors = themes.light.colors;

describe('pin features', () => {
  const pins = pinCollection(places, ['place-chelsea'], ['place-cinema', 'place-chelsea'], 'place-chill');

  it('has one point per place at its block, with state as properties', () => {
    expect(pins.features).toHaveLength(places.length);
    const megaron = pins.features.find((f) => f.id === 'place-chelsea')!;
    expect(megaron.geometry.coordinates).toEqual(toLngLat(realBlocks.find((b) => b.id === 'place-chelsea')!));
    expect(megaron.properties).toEqual({ id: 'place-chelsea', name: 'Chelsea Pavilion', category: 'stage', visited: true, bookmarked: true, selected: false });
    expect(pins.features.find((f) => f.id === 'place-cinema')!.properties).toMatchObject({ visited: false, bookmarked: true, selected: false });
    expect(pins.features.find((f) => f.id === 'place-chill')!.properties).toMatchObject({ visited: false, bookmarked: false, selected: true, category: 'lounge' });
  });
  it('follows the filtered place list and skips places without a position', () => {
    expect(pinCollection([places[0]], [], []).features).toHaveLength(1);
    expect(pinCollection([{ id: 'nowhere', name: 'Nowhere' }], [], []).features).toHaveLength(0);
  });
});

describe('pin and puck paint inputs', () => {
  const paint = pinPaint(colors);
  it('enlarges and recolours the selected pin from its property', () => {
    expect(paint.pin['circle-color']).toEqual(['case', ['get', 'selected'], colors.accent, colors.primary]);
    expect(paint.pin['circle-radius']).toEqual(['case', ['get', 'selected'], 14, 11]);
  });
  it('keeps pins a constant screen size and draws marks only for their state', () => {
    for (const layer of Object.values(paint)) expect(layer['circle-pitch-alignment']).toBe('viewport');
    expect(visitedFilter).toEqual(['==', ['get', 'visited'], true]);
    expect(bookmarkFilter).toEqual(['==', ['get', 'bookmarked'], true]);
  });
  it('colours the puck ring by position source', () => {
    expect(puckPaint(colors).dot['circle-stroke-color']).toEqual(['match', ['get', 'source'],
      'manual', colors.accent, 'checkpoint', colors.accent, 'simulated', colors.warning, colors.card]);
    expect(setByUserFilter).toEqual(['in', ['get', 'source'], ['literal', ['manual', 'checkpoint']]]);
    const position = { lngLat: [23.7, 37.9] as [number, number], accuracy: 5, timestamp: 0, source: 'simulated' as const };
    expect(puckCollection(position).features[0]).toMatchObject({ properties: { source: 'simulated' }, geometry: { coordinates: [23.7, 37.9] } });
    expect(puckCollection(undefined).features).toEqual([]);
  });
  it('places the heading mark in the compass direction', () => {
    expect(headingTranslate(0)).toEqual([0, -14]);
    expect(headingTranslate(90)).toEqual([14, 0]);
    expect(headingTranslate(180)).toEqual([0, 14]);
  });
});

describe('press to place', () => {
  const ids = places.map((p) => p.id);
  it('returns the first pressed feature that is a known place', () => {
    expect(placeIdFromPress([{ properties: { id: 'place-cinema' } }], ids)).toBe('place-cinema');
    expect(placeIdFromPress([{ properties: null }, { properties: { id: 'osm-way' } }, { properties: { id: 'place-chill' } }], ids)).toBe('place-chill');
  });
  it('ignores empty presses and unknown or malformed ids', () => {
    expect(placeIdFromPress([], ids)).toBeUndefined();
    expect(placeIdFromPress([{ properties: { id: 7 } }, { properties: { id: 'place-gone' } }], ids)).toBeUndefined();
  });
});
