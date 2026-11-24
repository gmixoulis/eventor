import { Camera, GeoJSONSource, Layer, Map, type CameraRef, type LngLatBounds, type MapRef } from '@maplibre/maplibre-react-native';
import { Component, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/components/theme';
import { bearing, focusedPath, type DirectionStep, type WalkingRoute } from '@/components/venue/directions';
import { toLngLat } from '@/components/venue/geo';
import { VENUE_CENTER, type LngLat } from '@/lib/geo';
import { accuracyRadius, toggleLocate } from '@/components/venue/location-fix';
import { MapControlButton, MapControls, MapLegend, ViewModeToggle } from '@/components/venue/map-controls';
import { bookmarkFilter, headingTranslate, pinCollection, pinPaint, placeIdFromPress, puckCollection, puckPaint, setByUserFilter, visitedFilter } from '@/components/venue/map-layers';
import type { Position } from '@/components/venue/position';
import { blockShapes, footprint, pathShapes } from '@/components/venue/real-venue';
import { typeScale } from '@/constants/theme';
import type { Place } from '@/data/types';

// OpenFreeMap: no key, no registration, commercial use allowed (https://openfreemap.org, /tos).
// Its required credits (OpenFreeMap, OpenMapTiles, OpenStreetMap) come from the style and show in the attribution control.
// Dark: OpenFreeMap's "Dark" style (listed on openfreemap.org/quick_start, same keyless tile and glyph servers).
export const MAP_STYLE_URL = { light: 'https://tiles.openfreemap.org/styles/liberty', dark: 'https://tiles.openfreemap.org/styles/dark' } as const;
const PITCH_3D = 55;
const STYLE_TIMEOUT_MS = 12000;

type Props = {
  places: Place[];
  visited: string[];
  bookmarked: string[];
  onSelect: (place: Place) => void;
  selectedId?: string;
  route?: WalkingRoute;
  step?: DirectionStep;
  /** Always from resolvePosition, whatever its source. */
  fix?: Position;
  /** Demo route walk: keep the camera on the walker. */
  tracking?: boolean;
  /** Set only while the person is choosing their position on the map. */
  onLongPress?: (lngLat: LngLat) => void;
  onFail: () => void;
  extraControls: ReactNode;
};

function boundsOf(points: LngLat[]): LngLatBounds {
  const lngs = points.map((p) => p[0]), lats = points.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** Any render error inside the native map switches the screen to the schematic instead of crashing it. */
class MapErrorBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function RealMap(props: Props) {
  return <MapErrorBoundary onFail={props.onFail}><RealMapView {...props} /></MapErrorBoundary>;
}

function RealMapView({ places, visited, bookmarked, onSelect, selectedId, route, step, fix, tracking, onLongPress, onFail, extraControls }: Props) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const heading = fix?.heading;
  const pins = pinCollection(places, visited, bookmarked, selectedId);
  const pinStyle = pinPaint(colors);
  const puckStyle = puckPaint(colors);
  const selectPressed = (features: GeoJSON.Feature[]) => {
    const id = placeIdFromPress(features, places.map((p) => p.id));
    const place = places.find((p) => p.id === id);
    if (place) onSelect(place);
  };
  const map = useRef<MapRef>(null);
  const camera = useRef<CameraRef>(null);
  const [mapBearing, setMapBearing] = useState(0);
  const [is3D, setIs3D] = useState(true);
  const [following, setFollowing] = useState(false);
  const loaded = useRef(false);
  // Until the style arrives MapLibre paints its own light canvas; a theme-colored cover keeps the load dark on dark.
  const [styleReady, setStyleReady] = useState(false);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 600;
  const line = route?.path.map(toLngLat) ?? [];
  const focus = route ? focusedPath(route, step) : undefined;
  const focusKey = focus?.map((node) => node.id).join() ?? '';

  const failIfNotLoaded = useEffectEvent(() => { if (!loaded.current) onFail(); });
  useEffect(() => {
    // No network on first use: the style never arrives and MapLibre may not report an error.
    const timer = setTimeout(failIfNotLoaded, STYLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const refit = useEffectEvent(() => {
    if (!focus || focus.length < 2 || tracking) return;
    // Step-by-step: face along the step so "left" and "right" on screen match the instruction.
    const facing = step && step.firstSegment >= 0 ? bearing(focus[0], focus[focus.length - 1]) : undefined;
    camera.current?.fitBounds(boundsOf(focus.map(toLngLat)), {
      padding: { top: 90, bottom: 40, left: 40, right: 70 }, pitch: is3D ? PITCH_3D : 0, bearing: facing, duration,
    });
  });
  useEffect(() => refit(), [focusKey]);

  const followFix = useEffectEvent(() => { if (fix && (tracking || (following && !route))) camera.current?.easeTo({ center: fix.lngLat, duration: tracking ? 250 : duration }); });
  const fixKey = fix ? fix.lngLat.join() : '';
  useEffect(() => followFix(), [fixKey]);

  async function zoomBy(delta: number) {
    const zoom = await map.current?.getZoom();
    if (zoom !== undefined) camera.current?.zoomTo(zoom + delta, { duration });
  }

  const locateLabel = following ? 'Stop following you and return to the venue' : fix ? 'Center on and follow my location' : 'Center on venue';
  function locate() {
    const next = toggleLocate(following, !!fix);
    setFollowing(next.following);
    camera.current?.flyTo({ center: next.target === 'user' && fix ? fix.lngLat : VENUE_CENTER, zoom: 17, duration });
  }
  const resetNorth = () => void camera.current?.setStop({ bearing: 0, duration });

  return (
    <View style={styles.fill}>
      <View accessible accessibilityRole="image" style={styles.mapSummary}
        accessibilityLabel={`Map of the Eventor Center and the the plaza, New York, from OpenStreetMap. ${places.length} festival places shown as pins; their positions are approximate. Pins are not readable by a screen reader: use the List button to browse places.${route ? ` Walking route of ${Math.round(route.metres)} metres shown.` : ''}`} />
      <Map ref={map} style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE_URL[scheme]} compass={false} logo={false}
        attribution attributionPosition={{ bottom: 8, left: 8 }} touchRotate touchPitch
        onDidFinishLoadingStyle={() => { loaded.current = true; setStyleReady(true); }} onDidFailLoadingMap={onFail}
        onLongPress={onLongPress ? ({ nativeEvent }) => onLongPress(nativeEvent.lngLat) : undefined}
        onRegionIsChanging={({ nativeEvent }) => setMapBearing(nativeEvent.bearing)}
        onRegionWillChange={({ nativeEvent }) => { if (nativeEvent.userInteraction) setFollowing(false); }}
        onRegionDidChange={({ nativeEvent }) => { setMapBearing(nativeEvent.bearing); setIs3D(nativeEvent.pitch > 10); }}>
        <Camera ref={camera} initialViewState={{ center: VENUE_CENTER, zoom: 17, pitch: PITCH_3D, bearing: -20 }} minZoom={13} maxZoom={20} />
        <GeoJSONSource id="osm-paths" data={pathShapes}>
          <Layer id="osm-path-lines" type="line" paint={{ 'line-color': colors.borderStrong, 'line-width': 2 }} />
        </GeoJSONSource>
        <GeoJSONSource id="osm-footprint" data={footprint}>
          <Layer id="venue-outline" type="line" paint={{ 'line-color': colors.primary, 'line-width': 2, 'line-opacity': 0.6 }} />
        </GeoJSONSource>
        <GeoJSONSource id="place-blocks" data={{ ...blockShapes, features: blockShapes.features.filter((f) => places.some((p) => p.id === f.id)) }}
          onPress={({ nativeEvent }) => selectPressed(nativeEvent.features)}>
          <Layer id="place-extrusions" type="fill-extrusion" paint={{
            'fill-extrusion-color': ['match', ['get', 'category'], 'stage', colors.primary, 'lounge', colors.success, colors.accent], 'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.85 }} />
          <Layer id="place-labels" type="symbol" layout={{ 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'],
            'text-size': 12, 'text-offset': [0, 1.6], 'text-anchor': 'top' }}
          paint={{ 'text-color': colors.text, 'text-halo-color': colors.card, 'text-halo-width': 1.5 }} />
        </GeoJSONSource>
        {/* Sources stay mounted (empty when unused) so the layer order never changes. */}
        <GeoJSONSource id="route" data={{ type: 'FeatureCollection', features: line.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }] : [] }}>
          <Layer id="route-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': colors.primary, 'line-width': 6 }} />
        </GeoJSONSource>
        {/* Pins and the puck are engine layers so they stay locked to the map during pan, rotate and tilt. */}
        <GeoJSONSource id="place-pins" data={pins} hitbox={{ top: 24, right: 24, bottom: 24, left: 24 }}
          onPress={({ nativeEvent }) => selectPressed(nativeEvent.features)}>
          <Layer id="place-pin" type="circle" paint={pinStyle.pin} />
          <Layer id="place-pin-visited" type="circle" filter={visitedFilter} paint={pinStyle.visited} />
          <Layer id="place-pin-bookmark" type="circle" filter={bookmarkFilter} paint={pinStyle.bookmark} />
        </GeoJSONSource>
        <GeoJSONSource id="user-accuracy" data={puckCollection(fix && fix.accuracy !== null ? fix : undefined)}>
          <Layer id="user-accuracy-circle" type="circle" paint={{
            'circle-radius': accuracyRadius(fix?.accuracy ?? 0, fix?.lngLat[1] ?? 0), 'circle-color': colors.primary, 'circle-opacity': 0.15,
            'circle-stroke-color': colors.primary, 'circle-stroke-width': 1, 'circle-stroke-opacity': 0.4,
            'circle-pitch-alignment': 'map', 'circle-pitch-scale': 'map' }} />
        </GeoJSONSource>
        {/* Always mounted: a walk or follow tick only changes this source's data. */}
        <GeoJSONSource id="user-puck" data={puckCollection(fix)}>
          <Layer id="user-heading" type="circle" paint={{ 'circle-radius': 4, 'circle-color': colors.primary,
            'circle-opacity': heading === undefined ? 0 : 0.8, 'circle-translate': headingTranslate(heading ?? 0), 'circle-translate-anchor': 'map' }} />
          <Layer id="user-puck-dot" type="circle" paint={puckStyle.dot} />
          <Layer id="user-puck-badge" type="circle" filter={setByUserFilter} paint={puckStyle.badge} />
        </GeoJSONSource>
      </Map>
      {styleReady ? null : <View pointerEvents="none" style={styles.cover} />}
      <MapControls routing={!!route}>
        {extraControls}
        <ViewModeToggle is3D={is3D} label={(raised) => `Show ${raised ? '3D tilted' : '2D flat'} map`}
          onChange={(raised) => { setIs3D(raised); void camera.current?.setStop({ pitch: raised ? PITCH_3D : 0, duration }); }} />
        <MapControlButton icon="location-arrow" label={locateLabel} onPress={locate} />
        <MapControlButton icon="compass" label={`Compass, map rotated ${Math.round(mapBearing)} degrees. Reset to north`} onPress={resetNorth} rotate={-mapBearing - 45} />
        <MapControlButton icon="plus" label="Zoom in" onPress={() => zoomBy(1)} />
        <MapControlButton icon="minus" label="Zoom out" onPress={() => zoomBy(-1)} />
      </MapControls>
      {!route ? <MapLegend title="Eventor Center">
        <Text style={styles.caption}>Stage positions are approximate</Text>
        <Text style={styles.caption}>Paths © OpenStreetMap contributors</Text>
        {fix?.source === 'gps' ? <Text style={styles.caption}>Your location is approximate indoors</Text> : null}
      </MapLegend> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  mapSummary: { position: 'absolute', width: 1, height: 1 },
  caption: { ...typeScale.caption, color: colors.textMuted },
}));
