import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';

import { makeStyles, useTheme } from '@/components/theme';
import { crowdColors } from '@/components/venue/crowd';
import { crowdLevel } from '@/components/venue/crowd-demo';
import type { DirectionStep, WalkingRoute } from '@/components/venue/directions';
import { backToFront, mapPoint } from '@/components/venue/projection';
import { blocks, entrance, gardens, venue, walkingGraph, type Point } from '@/components/venue/venue-data';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { Place } from '@/data/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);
export const PLAN_WIDTH = 280;
export const PLAN_HEIGHT = 220;

type Props = {
  is3D: boolean; width: number; scale: SharedValue<number>; places: Place[];
  visited: string[]; bookmarked: string[]; selectedId?: string;
  route?: WalkingRoute; step?: DirectionStep; onSelect: (place: Place) => void;
};

export function VenuePlan({ is3D, width, scale, places, visited, bookmarked, selectedId, route, step, onSelect }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const flow = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const hasRoute = !!route?.segments.length;
  useEffect(() => {
    flow.set(0);
    if (hasRoute && !reduceMotion) flow.set(withRepeat(withTiming(-12, { duration: 900, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(flow);
  }, [flow, hasRoute, reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: flow.get() }));
  const points = (items: Point[], height = 0) => items.map((point) => {
    const p = mapPoint(point, is3D, height);
    return `${p.x},${p.y}`;
  }).join(' ');
  const line = (items: Point[]) => items.map((point, index) => {
    const p = mapPoint(point, is3D);
    return `${index ? 'L' : 'M'}${p.x},${p.y}`;
  }).join(' ');
  const rectangle = (x: number, y: number, w: number, d: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];
  const start = mapPoint(route?.path[0] ?? entrance, is3D);
  const finish = route?.path[route.path.length - 1];
  const end = finish && mapPoint(finish, is3D);
  const north = mapPoint({ x: 12, y: 14 }, is3D);
  const northTip = mapPoint({ x: 12, y: 2 }, is3D);
  const metreStart = mapPoint({ x: 10, y: 130 }, is3D);
  const metreEnd = mapPoint({ x: 30, y: 130 }, is3D);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`} accessible={false}>
        <Polygon points={points(rectangle(0, 3, venue.width, venue.depth))} fill={colors.borderStrong} />
        <Polygon points={points(rectangle(0, 0, venue.width, venue.depth))} fill={colors.card} stroke={colors.borderStrong} strokeWidth={0.7} />
        {gardens.map((garden, index) => <G key={index}>
          <Polygon points={points(rectangle(garden.x, garden.y, garden.width, garden.depth))} fill={colors.successSoft} />
          {[0.2, 0.5, 0.8].map((fraction) => {
            const p = mapPoint({ x: garden.x + garden.width * fraction, y: garden.y + garden.depth / 2 }, is3D);
            return <Circle key={fraction} cx={p.x} cy={p.y} r={2.6} fill={colors.success} opacity={0.35} />;
          })}
        </G>)}
        {walkingGraph.edges.map((edge) => {
          const a = walkingGraph.nodes.find((node) => node.id === edge.from)!;
          const b = walkingGraph.nodes.find((node) => node.id === edge.to)!;
          return <Path key={`${edge.from}-${edge.to}`} d={line([a, b])} stroke={colors.primarySoft} strokeWidth={6} strokeLinecap="round" />;
        })}
        {hasRoute && route ? <G>
          <Path d={line(route.path)} fill="none" stroke={colors.card} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={line(route.path)} fill="none" stroke={colors.primary} strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round" />
          {step && step.firstSegment >= 0 ? <Path d={line(route.path.slice(step.firstSegment, step.lastSegment + 2))}
            fill="none" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
          <AnimatedPath d={line(route.path)} animatedProps={animatedProps} fill="none" stroke={colors.onPrimary} strokeOpacity={0.75}
            strokeWidth={1} strokeDasharray="4 8" strokeLinecap="round" />
          <Circle cx={start.x} cy={start.y} r={3.5} fill={colors.primary} stroke={colors.card} strokeWidth={1.5} />
        </G> : null}
        {backToFront(blocks).map((block) => {
          const corners = rectangle(block.x - block.width / 2, block.y - block.depth / 2, block.width, block.depth);
          const top = corners.map((p) => mapPoint(p, is3D, block.height));
          const base = corners.map((p) => mapPoint(p, is3D));
          const polygon = (p: Point[]) => p.map((v) => `${v.x},${v.y}`).join(' ');
          const fill = block.category === 'stage' ? colors.primary : block.category === 'lounge' ? colors.successSoft : colors.accentSoft;
          return <G key={block.id} opacity={selectedId && selectedId !== block.id ? 0.5 : 1}>
            {is3D ? [1, 2].map((side, index) => {
              const face = [top[side], top[(side + 1) % 4], base[(side + 1) % 4], base[side]];
              return <G key={side}>
                <Polygon points={polygon(face)} fill={fill} />
                {/* Side shading is always a dark tint, so faces read as shaded in both themes. */}
                <Polygon points={polygon(face)} fill="#0F141E" opacity={index ? 0.26 : 0.14} />
              </G>;
            }) : null}
            <Polygon points={polygon(top)} fill={fill} stroke={selectedId === block.id ? colors.accent : colors.borderStrong}
              strokeWidth={selectedId === block.id ? 2 : 0.5} strokeLinejoin="round" />
          </G>;
        })}
        <Path d={`M${north.x},${north.y} L${northTip.x},${northTip.y}`} stroke={colors.textMuted} strokeWidth={1.2} />
        <Polygon points={points([{ x: 12, y: 2 }, { x: 9, y: 7 }, { x: 15, y: 7 }])} fill={colors.textMuted} />
        <Path d={`M${metreStart.x},${metreStart.y} L${metreEnd.x},${metreEnd.y}`} stroke={colors.textMuted} strokeWidth={1.5} />
      </Svg>
      <Text style={[styles.annotation, { left: northTip.x / PLAN_WIDTH * width - 5, top: northTip.y / PLAN_WIDTH * width - 20 }]}>N</Text>
      <Text style={[styles.annotation, { left: metreStart.x / PLAN_WIDTH * width, top: metreStart.y / PLAN_WIDTH * width + 4 }]}>20 m</Text>
      <Marker point={entrance} is3D={is3D} width={width} scale={scale} label="Main entrance" icon="door-open" />
      {end && finish ? <Marker point={finish} is3D={is3D} width={width} scale={scale} label={`Destination: ${finish.name}`} icon="flag-checkered" /> : null}
      {places.map((place) => {
        const block = blocks.find((b) => b.id === place.id)!;
        return <MapPin key={place.id} place={place} point={mapPoint(block, is3D, is3D ? block.height : 0)}
          width={width} scale={scale} visited={visited.includes(place.id)} bookmarked={bookmarked.includes(place.id)}
          selected={selectedId === place.id} onPress={() => onSelect(place)} />;
      })}
    </View>
  );
}

function Marker({ point, is3D, width, scale, label, icon }: {
  point: Point; is3D: boolean; width: number; scale: SharedValue<number>; label: string; icon: 'door-open' | 'flag-checkered';
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const p = mapPoint(point, is3D);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.get() }] }));
  return <Animated.View accessible accessibilityLabel={label} pointerEvents="none"
    style={[styles.marker, { left: p.x / PLAN_WIDTH * width - 12, top: p.y / PLAN_WIDTH * width - 12 }, style]}>
    <FontAwesome5 name={icon} color={colors.onPrimary} size={12} />
  </Animated.View>;
}

function MapPin({ place, point, width, scale, visited, bookmarked, selected, onPress }: {
  place: Place; point: Point; width: number; scale: SharedValue<number>;
  visited: boolean; bookmarked: boolean; selected: boolean; onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.get() }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: scale.get() >= 1.6 || selected ? 1 : 0 }));
  const level = crowdLevel(place.id);
  return <Animated.View pointerEvents="box-none" style={[styles.pinPosition,
    { left: point.x / PLAN_WIDTH * width - 22, top: point.y / PLAN_WIDTH * width - 22 }, pinStyle]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${place.name}${visited ? ', visited' : ''}${bookmarked ? ', bookmarked' : ''}`}
      accessibilityState={{ selected }} onPress={onPress} style={[styles.pin, selected && styles.selectedPin]}>
      <FontAwesome5 name={visited ? 'check' : 'map-marker-alt'} size={13} color={selected ? colors.onAccent : colors.onPrimary} />
      {bookmarked ? <View style={styles.badge}><FontAwesome5 name="bookmark" solid size={9} color={colors.primary} /></View> : null}
      {level ? <View style={[styles.crowdDot, { backgroundColor: crowdColors(level, colors).fg }]} /> : null}
    </Pressable>
    <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden style={[styles.pinLabel, labelStyle]}>
      <Text style={styles.label} numberOfLines={2}>{place.name}</Text>
    </Animated.View>
  </Animated.View>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  annotation: { ...typeScale.caption, position: 'absolute', color: colors.textMuted },
  marker: { position: 'absolute', width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center' },
  pinPosition: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primary,
    borderWidth: 2, borderColor: colors.onPrimary, alignItems: 'center', justifyContent: 'center' },
  selectedPin: { backgroundColor: colors.accent, borderColor: colors.onAccent },
  badge: { position: 'absolute', top: -5, right: -5, width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderRadius: radius.pill },
  // Demo crowd level; separate corner from the bookmark badge.
  crowdDot: { position: 'absolute', bottom: -4, right: -4, width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: colors.card },
  pinLabel: { position: 'absolute', top: 42, width: 132, paddingHorizontal: spacing.xs,
    borderRadius: radius.xs, backgroundColor: colors.card },
  label: { ...typeScale.caption, color: colors.text, textAlign: 'center' },
}));
