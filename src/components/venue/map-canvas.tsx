import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/components/theme';
import { focusedPath, type DirectionStep, type WalkingRoute } from '@/components/venue/directions';
import { MapControlButton, MapControls, MapLegend, ViewModeToggle } from '@/components/venue/map-controls';
import { clampMap } from '@/components/venue/math';
import { mapPoint } from '@/components/venue/projection';
import { PLAN_HEIGHT, PLAN_WIDTH, VenuePlan } from '@/components/venue/venue-plan';
import { motion, radius, spacing, typeScale } from '@/constants/theme';
import type { Place } from '@/data/types';

type Props = {
  places: Place[];
  visited: string[];
  bookmarked: string[];
  onSelect: (place: Place) => void;
  selectedId?: string;
  route?: WalkingRoute;
  step?: DirectionStep;
  extraControl?: ReactNode;
};

export function MapCanvas({ places, visited, bookmarked, onSelect, selectedId, route, step, extraControl }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [is3D, setIs3D] = useState(true);
  const blend = useSharedValue(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const imageHeight = size.width * PLAN_HEIGHT / PLAN_WIDTH;
  const focused = route ? focusedPath(route, step) : [];
  const projected = focused.map((point) => mapPoint(point, is3D));
  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));
  useEffect(() => {
    blend.set(reduceMotion ? Number(is3D) : withTiming(Number(is3D), { duration: motion.duration.fast }));
  }, [blend, is3D, reduceMotion]);
  useEffect(() => {
    if (!Number.isFinite(minX) || !size.width || !size.height) return;
    const unit = size.width / PLAN_WIDTH;
    const target = Math.min(4, Math.max(1, Math.min(
      Math.max(1, size.width - 100) / Math.max(1, (maxX - minX) * unit),
      Math.max(1, size.height - 100) / Math.max(1, (maxY - minY) * unit))));
    const next = clampMap(target, (PLAN_WIDTH / 2 - (minX + maxX) / 2) * unit * target,
      (PLAN_HEIGHT / 2 - (minY + maxY) / 2) * unit * target, size.width, imageHeight, size.width, size.height);
    scale.set(reduceMotion ? next.scale : withTiming(next.scale, { duration: motion.duration.enter }));
    x.set(reduceMotion ? next.x : withTiming(next.x, { duration: motion.duration.enter }));
    y.set(reduceMotion ? next.y : withTiming(next.y, { duration: motion.duration.enter }));
  }, [minX, maxX, minY, maxY, size.width, size.height, imageHeight, reduceMotion, scale, x, y]);
  const flatStyle = useAnimatedStyle(() => ({ opacity: 1 - blend.get() }));
  const raisedStyle = useAnimatedStyle(() => ({ opacity: blend.get() }));

  function zoom(target: number, reset = false) {
    'worklet';
    const next = clampMap(target, reset ? 0 : x.get(), reset ? 0 : y.get(),
      size.width, imageHeight, size.width, size.height);
    const spring = { overshootClamping: true };
    scale.set(reduceMotion ? next.scale : withSpring(next.scale, spring));
    x.set(reduceMotion ? next.x : withSpring(next.x, spring));
    y.set(reduceMotion ? next.y : withSpring(next.y, spring));
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(scale);
      cancelAnimation(x);
      cancelAnimation(y);
      startScale.set(scale.get());
    })
    .onUpdate((event) => {
      const next = clampMap(startScale.get() * event.scale, x.get(), y.get(),
        size.width, imageHeight, size.width, size.height);
      scale.set(next.scale);
      x.set(next.x);
      y.set(next.y);
    });
  const pan = Gesture.Pan().averageTouches(true)
    .onStart(() => {
      cancelAnimation(scale);
      cancelAnimation(x);
      cancelAnimation(y);
      const bounded = clampMap(scale.get(), x.get(), y.get(),
        size.width, imageHeight, size.width, size.height);
      startX.set(bounded.x);
      startY.set(bounded.y);
    })
    .onUpdate((event) => {
      const next = clampMap(scale.get(), startX.get() + event.translationX,
        startY.get() + event.translationY, size.width, imageHeight, size.width, size.height);
      x.set(next.x);
      y.set(next.y);
    });
  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd((_event, success) => {
    if (success) zoom(scale.get() > 1 ? 1 : 2, true);
  });
  const mapStyle = useAnimatedStyle(() => {
    const bounded = clampMap(scale.get(), x.get(), y.get(),
      size.width, imageHeight, size.width, size.height);
    return { transform: [{ translateX: bounded.x }, { translateY: bounded.y }, { scale: bounded.scale }] };
  });

  return (
    <GestureHandlerRootView style={styles.fill}>
      <View accessible accessibilityRole="image"
        accessibilityLabel="Schematic venue, 200 by 140 metres. Six places connected by walking promenades. Place pins open details and directions."
        style={styles.mapSummary} />
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
        <View style={[styles.viewport, route && styles.routingViewport]} collapsable={false} onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}>
          <Animated.View style={[{ width: size.width, height: imageHeight }, mapStyle]}>
            {[false, true].map((raised) => <Animated.View key={String(raised)}
              pointerEvents={raised === is3D ? 'auto' : 'none'} accessibilityElementsHidden={raised !== is3D}
              importantForAccessibility={raised === is3D ? 'auto' : 'no-hide-descendants'}
              style={[StyleSheet.absoluteFill, raised ? raisedStyle : flatStyle]}>
              <VenuePlan is3D={raised} width={size.width} scale={scale} places={places} visited={visited}
                bookmarked={bookmarked} selectedId={selectedId} route={route} step={step} onSelect={onSelect} />
            </Animated.View>)}
          </Animated.View>
        </View>
      </GestureDetector>
      <MapControls routing={!!route}>
        {extraControl}
        <ViewModeToggle is3D={is3D} onChange={setIs3D} label={(raised) => `Show ${raised ? '3D' : '2D'} venue map`} />
        {([
          ['location-arrow', 'Center map', () => zoom(1, true)],
          ['plus', 'Zoom in', () => zoom(scale.get() + 0.5)],
          ['minus', 'Zoom out', () => zoom(scale.get() - 0.5)],
          ['expand', 'Reset map', () => zoom(1, true)],
        ] as const).map(([icon, label, onPress]) => (
          <MapControlButton key={label} icon={icon} label={label} onPress={onPress} />
        ))}
      </MapControls>
      {!route ? <MapLegend title="Explore the venue">
        <Text style={styles.caption}>Schematic · Tap a pin for directions</Text>
        <View style={styles.legendRow}>
          {([['Stages', colors.primary], ['Lounges', colors.successSoft], ['Services', colors.accentSoft]] as const).map(([name, color]) =>
            <View key={name} style={styles.legendRow}><View style={[styles.swatch, { backgroundColor: color }]} /><Text style={styles.caption}>{name}</Text></View>)}
        </View>
      </MapLegend> : null}
    </GestureHandlerRootView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  mapSummary: { position: 'absolute', width: 1, height: 1 },
  viewport: { position: 'absolute', top: 108, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  routingViewport: { top: 64 },
  caption: { ...typeScale.caption, color: colors.textMuted },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 8, height: 8, borderRadius: radius.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
}));
