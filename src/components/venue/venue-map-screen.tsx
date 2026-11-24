import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, TurboModuleRegistry, View, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { CheckpointScanner } from '@/components/venue/checkpoint-scanner';
import { directionSteps, shortestRoute } from '@/components/venue/directions';
import { DirectionsPanel, FromPicker } from '@/components/venue/directions-panel';
import { isNearVenue, snap, toLngLat, toLocal } from '@/components/venue/geo';
import type { LngLat } from '@/lib/geo';
import { GpsBackNotice, NoFixActions, PermissionNotice, PickingNotice } from '@/components/venue/location-notices';
import { CrowdLegend } from '@/components/venue/crowd';
import { LocationReadout, PositionSheet } from '@/components/venue/location-readout';
import { MapCanvas } from '@/components/venue/map-canvas';
import { MapPill, PillRow } from '@/components/venue/map-pill';
import { PlaceList } from '@/components/venue/place-list';
import { PlaceSheet } from '@/components/venue/place-sheet';
import { gpsAccurateAgain, resolvePosition, SIMULATED_ACCURACY_METRES, stepAt, type PositionOverride } from '@/components/venue/position';
import type { RealMap as RealMapComponent } from '@/components/venue/real-map';
import { realBlocks, realEntrance, realGraph } from '@/components/venue/real-venue';
import { useRouteWalk } from '@/components/venue/use-route-walk';
import { useVenueLocation } from '@/components/venue/use-venue-location';
import { blocks, walkingGraph } from '@/components/venue/venue-data';
import { WalkControls } from '@/components/venue/walk-controls';
import { radius, spacing, typeScale } from '@/constants/theme';
import { listPlaces } from '@/data';
import type { Place } from '@/data/types';
import { useBookmarks } from '@/store';

// MapLibre's JS throws on import when its native module is missing (web, Expo Go, tests), so load it only when present.
const RealMap: typeof RealMapComponent | undefined = Platform.OS !== 'web' && TurboModuleRegistry.get('MLRNMapViewModule')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/venue/real-map').RealMap : undefined;

/**
 * The venue map screen. "Map" shows the real MapLibre street map (OpenStreetMap tiles) by default and
 * falls back to the schematic drawing where the native map engine is unavailable (web, Expo Go, offline).
 * Search, filters, list, place sheet, directions and the position readout are the same in both.
 */
export function VenueMapScreen({ variant }: { variant: 'schematic' | 'real' }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [visitedOnly, setVisitedOnly] = useState(false);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [mode, setMode] = useState<'auto' | 'map' | 'list'>('auto');
  const [selected, setSelected] = useState<Place | null>(null);
  const [journey, setJourney] = useState<{ from: string; to: string } | null>(null);
  const [fromPicker, setFromPicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [mapFailed, setMapFailed] = useState(false);
  const [locationAsked, setLocationAsked] = useState(false);
  const [positionSheet, setPositionSheet] = useState(false);
  const [override, setOverride] = useState<PositionOverride>();
  const [picking, setPicking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [gpsOfferDismissed, setGpsOfferDismissed] = useState(false);
  // Demo simulation lives in memory only, so it is always off after a restart.
  const [simulatedSince, setSimulatedSince] = useState<number>();
  const [walkFrom, setWalkFrom] = useState<LngLat>();
  const { status, phase, requestPermission, openSettings, improveAccuracy, fix, heading } = useVenueLocation();
  const [choosePosition, setChoosePosition] = useState(false);
  const simulated = simulatedSince !== undefined;
  const entranceLngLat = toLngLat(realEntrance);
  const restingPosition = resolvePosition({ gps: fix, gpsHeading: heading, override,
    simulated: simulated ? { lngLat: entranceLngLat, accuracy: SIMULATED_ACCURACY_METRES, timestamp: simulatedSince } : undefined });
  // While the demo walks, directions keep starting where the walk began rather than chasing the walker.
  const anchor = walkFrom ?? restingPosition?.lngLat;
  const real = variant === 'real' && !mapFailed && !!RealMap;
  const near = real && anchor && isNearVenue(anchor) ? anchor : undefined;
  const graph = !real ? walkingGraph : near ? snap(realGraph, { id: 'me', name: 'your location', ...toLocal(near) }) : realGraph;
  // On the schematic there is no geographic frame: a position set at a place starts directions from that place.
  const placeStart = !real && override?.placeId && graph.nodes.some((node) => node.id === override.placeId) ? override.placeId : undefined;
  const fromId = journey && graph.nodes.some((node) => node.id === journey.from) ? journey.from : 'entrance';
  const route = journey ? shortestRoute(graph, fromId, journey.to) : undefined;
  const destination = graph.nodes.find((node) => node.id === journey?.to);
  const origin = graph.nodes.find((node) => node.id === fromId);
  const steps = route && destination ? directionSteps(route, destination.name, (real ? realBlocks : blocks).find((block) => block.id === destination.id)) : [];
  const walker = useRouteWalk(walkFrom ? route?.path : undefined, steps);
  const position = walker.at && walker.walk && simulated ? resolvePosition({ simulated: { lngLat: toLngLat(walker.at.point),
    accuracy: 6.5 + 2.5 * Math.sin(walker.walk.distance / 7), timestamp: simulatedSince, heading: walker.at.bearing } }) : restingPosition;
  const shownStep = walker.at ? stepAt(steps, walker.at.segment, walker.at.done) : currentStep;
  const input = useRef<TextInputInstance>(null);
  const { visited, bookmarked, toggleVisited } = useBookmarks();
  const insets = useSafeAreaInsets();
  const places = listPlaces(query).filter((place) =>
    (!visitedOnly && !bookmarksOnly) ||
    (visitedOnly && visited.includes(place.id)) ||
    (bookmarksOnly && bookmarked.includes(place.id)));
  const showList = !journey && (mode === 'list' || (mode === 'auto' && (visitedOnly || bookmarksOnly) && places.length === 0));

  useEffect(() => {
    if (!selected && !journey) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected) setSelected(null);
      else setJourney(null);
      return true;
    });
    return () => subscription.remove();
  }, [selected, journey]);

  function select(place: Place) {
    Keyboard.dismiss();
    setJourney(null);
    setSelected(place);
  }

  function startDirections(from: string, to: string) {
    setJourney({ from, to }); setSelected(null); setFromPicker(false); setCurrentStep(-1); setMode('map');
  }

  function stopWalk() {
    if (walker.at) setCurrentStep(shownStep);
    walker.stop();
    setWalkFrom(undefined);
  }

  function setPlacePosition(place: Place, source: PositionOverride['source']) {
    const block = realBlocks.find((b) => b.id === place.id);
    if (!block) return;
    setOverride({ source, lngLat: toLngLat(block), label: place.name, timestamp: Date.now(), placeId: place.id });
    setGpsOfferDismissed(false);
    setPicking(false);
    setPositionSheet(false);
  }

  function onCheckpoint(placeId: string) {
    const place = listPlaces().find((p) => p.id === placeId);
    setScanning(false);
    if (!place) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlacePosition(place, 'checkpoint');
    if (!visited.includes(placeId)) toggleVisited(placeId);
  }

  function endDirections() {
    stopWalk();
    setJourney(null);
    setFromPicker(false);
    setCurrentStep(-1);
  }

  const scanControl = <Pressable accessibilityRole="button" accessibilityLabel="Scan a checkpoint" onPress={() => setScanning(true)} style={[styles.control, styles.segment]}>
    <FontAwesome5 name="qrcode" size={15} color={colors.text} />
  </Pressable>;
  const title = 'Map';
  const walkControls = simulated && route && route.segments.length ? <WalkControls walker={walker} onStop={stopWalk}
    onStart={() => { setWalkFrom(anchor ?? entranceLngLat); walker.start(); }} /> : null;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.page}>
      <ScreenHeader title={title} variant="stack" />
      <View style={styles.area}>
        <View style={[styles.canvas, journey && styles.routingCanvas]} accessibilityElementsHidden={!!selected || showList}
          importantForAccessibility={selected || showList ? 'no-hide-descendants' : 'auto'}>
          {real && RealMap ? <RealMap places={journey ? listPlaces() : places} visited={visited} bookmarked={bookmarked} onSelect={select}
            selectedId={selected?.id ?? journey?.to} route={route} step={steps[shownStep]} fix={position} tracking={!!walker.walk?.playing}
            onLongPress={picking ? (lngLat) => { setOverride({ source: 'manual', lngLat, label: 'a point on the map', timestamp: Date.now() });
              setGpsOfferDismissed(false); setPicking(false); } : undefined}
            onFail={() => setMapFailed(true)} extraControls={scanControl} />
            : <MapCanvas places={journey ? listPlaces() : places} visited={visited} bookmarked={bookmarked} onSelect={select}
              selectedId={selected?.id ?? journey?.to} route={route} step={steps[shownStep]} extraControl={scanControl} />}
        </View>
        {showList ? <PlaceList places={places} hidden={!!selected} bottomInset={insets.bottom} onSelect={select} /> : null}
        <View style={styles.top} pointerEvents="box-none">
          <View style={styles.search}>
            <Pressable accessibilityRole="button" accessibilityLabel={journey ? 'End directions' : selected ? 'Back to places' : 'Show place list'}
              hitSlop={8} onPress={() => journey ? endDirections() : selected ? setSelected(null) : setMode('list')}>
              <FontAwesome5 name={selected || journey ? 'chevron-left' : 'bars'} size={15} color={colors.text} />
            </Pressable>
            {selected || journey ? <Text style={styles.selectedName} numberOfLines={1}>{selected?.name ?? `To ${destination?.name ?? 'destination'}`}</Text> : (
              <TextInput ref={input} accessibilityLabel="Search places" placeholder="Search" placeholderTextColor={colors.textMuted} cursorColor={colors.primary} selectionColor={colors.primary}
                value={query} onChangeText={(value) => { setQuery(value); setMode('auto'); }} autoCapitalize="none" autoCorrect={false}
                returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} style={styles.input} />
            )}
            <Pressable accessibilityRole="button" accessibilityLabel={journey ? 'End directions' : selected ? 'Close place' : query ? 'Clear search' : 'Search places'}
              hitSlop={8} onPress={() => {
                if (journey) endDirections();
                else if (selected) setSelected(null);
                else if (query) { setQuery(''); setMode('auto'); }
                else input.current?.focus();
              }}>
              <FontAwesome5 name={selected || journey || query ? 'times' : 'search'} size={15} color={colors.text} />
            </Pressable>
          </View>
          {!selected && !journey ? <PillRow>
            {([
              ['Visited', 'check', visitedOnly, () => { setVisitedOnly(!visitedOnly); setMode('auto'); }],
              ['Bookmarks', 'bookmark', bookmarksOnly, () => { setBookmarksOnly(!bookmarksOnly); setMode('auto'); }],
            ] as const).map(([label, icon, active, onPress]) => (
              <MapPill key={label} label={label} icon={icon} active={active} accessibilityLabel={`Filter ${label.toLowerCase()}`}
                accessibilityState={{ selected: active }} onPress={onPress} />
            ))}
          </PillRow> : null}
          {!selected ? <LocationReadout position={position} gpsOn={status === 'granted'} noFix={status === 'granted' && phase === 'noFix'}
            onPress={() => { setChoosePosition(false); setPositionSheet(true); }} /> : null}
          {status === 'granted' && phase === 'noFix' && position?.source !== 'manual' && position?.source !== 'checkpoint' && !simulated && !selected && !journey ? (
            <NoFixActions improveAccuracy={improveAccuracy} onSetManually={() => { setChoosePosition(true); setPositionSheet(true); }} />
          ) : null}
          {picking && real ? <PickingNotice onCancel={() => setPicking(false)} /> : null}
          {override && !simulated && !gpsOfferDismissed && gpsAccurateAgain(fix) && !selected ? (
            <GpsBackNotice onSwitchBack={() => setOverride(undefined)} onKeep={() => setGpsOfferDismissed(true)} />
          ) : null}
          {status !== 'granted' && status !== 'unknown' && !locationAsked && !selected && !journey ? (
            <PermissionNotice status={status} onDismiss={() => setLocationAsked(true)}
              onAllow={() => { setLocationAsked(true); void requestPermission(); }}
              onOpenSettings={() => { setLocationAsked(true); openSettings(); }} />
          ) : null}
        </View>
        {!selected && !journey ? <View style={[styles.togglePosition, { bottom: spacing.lg + insets.bottom }]} pointerEvents="box-none">
          <MapPill label={showList ? 'Map' : 'List'} accessibilityLabel={showList ? 'Show map' : 'Show list'} icon={showList ? 'map' : 'list'}
            iconSize={13} active={showList} onPress={() => setMode(showList ? 'map' : 'list')} />
        </View> : null}
        {!selected && !journey && !showList ? <View style={[styles.crowdLegend, { bottom: spacing.lg + insets.bottom }]} pointerEvents="none">
          <CrowdLegend />
        </View> : null}
        {selected ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss place details" onPress={() => setSelected(null)} style={styles.dim} /> : null}
        {selected ? <PlaceSheet place={selected} onClose={() => setSelected(null)}
          onDirections={() => near ? startDirections('me', selected.id) : placeStart && placeStart !== selected.id ? startDirections(placeStart, selected.id) : setFromPicker(true)} /> : null}
        {journey && destination && origin ? <DirectionsPanel destination={destination.name} from={origin.id === 'me' ? 'my location' : origin.name} route={route}
          caption={real ? 'Walking routes use OpenStreetMap paths. Stage positions are approximate.' : 'Directions are approximate and based on a schematic of the venue.'}
          steps={steps} current={shownStep} onStep={(index) => { stopWalk(); setCurrentStep(index); }} extra={walkControls} onFrom={() => setFromPicker(true)}
          onSwap={() => { setJourney({ from: journey.to, to: fromId }); setCurrentStep(-1); }} onEnd={endDirections} /> : null}
        {positionSheet ? <PositionSheet startChoosing={choosePosition} position={position} places={listPlaces()} gpsOn={status === 'granted'} overridden={!!override} simulated={simulated}
          onSetPlace={(place) => setPlacePosition(place, 'manual')} onPickOnMap={real ? () => { setPicking(true); setPositionSheet(false); } : undefined}
          onUseGps={() => { setOverride(undefined); setPositionSheet(false); }} onScan={() => { setPositionSheet(false); setScanning(true); }}
          onSimulate={variant === 'real' ? (on) => { if (!on) stopWalk(); setSimulatedSince(on ? Date.now() : undefined); } : undefined} onClose={() => setPositionSheet(false)} /> : null}
        {scanning ? <CheckpointScanner placeIds={listPlaces().map((p) => p.id)} onFound={onCheckpoint} onClose={() => setScanning(false)} /> : null}
        {fromPicker && (selected || journey) ? <FromPicker graph={graph} destinationId={selected?.id ?? journey!.to}
          fromId={journey ? fromId : near ? 'me' : placeStart ?? 'entrance'} onClose={() => setFromPicker(false)}
          onChoose={(from) => startDirections(from, selected?.id ?? journey!.to)} /> : null}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  area: { flex: 1, overflow: 'hidden' },
  canvas: { ...StyleSheet.absoluteFill },
  routingCanvas: { bottom: '40%' },
  top: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, zIndex: 5, gap: spacing.sm },
  search: { height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg,
    borderRadius: radius.md, backgroundColor: colors.card, ...shadow.card },
  input: { ...typeScale.body, color: colors.text, flex: 1, padding: 0, height: '100%' },
  selectedName: { ...typeScale.label, color: colors.text, flex: 1 },
  togglePosition: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  crowdLegend: { position: 'absolute', left: spacing.md },
  segment: { borderRadius: radius.sm, backgroundColor: colors.card, ...shadow.card },
  control: { width: 44, height: 44, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  dim: { ...StyleSheet.absoluteFill, zIndex: 4, backgroundColor: colors.overlay },
}));
