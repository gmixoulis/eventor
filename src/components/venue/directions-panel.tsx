import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { walkingMinutes, type DirectionStep, type WalkingRoute } from '@/components/venue/directions';
import type { WalkingGraph } from '@/components/venue/venue-data';
import { motion, radius, spacing, typeScale } from '@/constants/theme';

const rank = (id: string) => id === 'me' ? 0 : id === 'entrance' ? 1 : 2;

export function FromPicker({ graph, destinationId, fromId, onChoose, onClose }: {
  graph: WalkingGraph; destinationId: string; fromId: string; onChoose: (id: string) => void; onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  // "My location" (only present when the user is near the venue), then the main entrance, then the other places.
  const options = graph.nodes.filter((node) => rank(node.id) < 2 || (node.id.startsWith('place-') && node.id !== destinationId))
    .sort((a, b) => rank(a.id) - rank(b.id));
  return <Sheet visible title="From" onClose={onClose}
    headerRight={<IconButton icon="times" label="Close starting point picker" onPress={onClose} />}>
        <ScrollView style={{ maxHeight: height * 0.6 }}>
          {options.map((node) => <Pressable key={node.id} accessibilityRole="button" accessibilityLabel={`Directions from ${node.id === 'me' ? 'my location' : node.name}`}
            accessibilityState={{ selected: fromId === node.id }} onPress={() => onChoose(node.id)} style={styles.option}>
            <FontAwesome5 name={node.id === 'me' ? 'location-arrow' : node.id === 'entrance' ? 'door-open' : 'map-marker-alt'} size={16} color={colors.primary} />
            <Text style={styles.body}>{node.id === 'me' ? 'My location' : node.name}</Text>
            {fromId === node.id ? <FontAwesome5 name="check" size={14} color={colors.primary} /> : null}
          </Pressable>)}
        </ScrollView>
  </Sheet>;
}

export function DirectionsPanel({ destination, from, caption, route, steps, current, onStep, onFrom, onSwap, onEnd, extra }: {
  destination: string; from: string; caption: string; extra?: ReactNode; route?: WalkingRoute; steps: DirectionStep[]; current: number;
  onStep: (index: number) => void; onFrom: () => void; onSwap: () => void; onEnd: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<number[]>([]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: offsets.current[current] ?? 0, animated: !reduceMotion });
  }, [current, reduceMotion]);
  return <Animated.View style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm }]}
    entering={reduceMotion ? undefined : SlideInDown.duration(motion.duration.enter)}
    exiting={reduceMotion ? undefined : SlideOutDown.duration(motion.duration.exit)}>
    <View style={styles.heading}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={2}>To {destination}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.summary}>{route ? `${Math.round(route.metres)} m · ${walkingMinutes(route.metres)} min` : 'No walking route available'}</Text>
      </View>
      <IconButton icon="exchange-alt" label="Swap start and destination" onPress={onSwap} />
      <IconButton icon="times" label="End directions" onPress={onEnd} />
    </View>
    <Text style={styles.caption}>{caption}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Change starting point, currently ${from}`} onPress={onFrom} style={styles.from}>
      <Text style={styles.fromText} numberOfLines={1}>From {from}</Text>
      <FontAwesome5 name="chevron-down" size={12} color={colors.primary} />
    </Pressable>
    {extra}
    <ScrollView ref={scroll} style={styles.steps} contentContainerStyle={styles.stepContent}>
      {steps.map((step, index) => <Pressable key={`${index}-${step.text}`} accessible accessibilityRole="button"
        accessibilityLabel={`Step ${index + 1} of ${steps.length}. ${step.text.replace(/\bm\b/g, 'metres')}`}
        accessibilityState={{ selected: current === index }} onPress={() => onStep(index)}
        onLayout={({ nativeEvent }) => { offsets.current[index] = nativeEvent.layout.y; }}
        style={[styles.step, current === index && styles.current]}>
        <Text style={styles.number}>{index + 1}</Text>
        <FontAwesome5 name={step.icon} size={16} color={colors.primary} />
        <Text style={styles.stepText}>{step.text}</Text>
      </Pressable>)}
    </ScrollView>
    <View style={styles.footer}>
      <TextButton label="Previous" disabled={current <= 0} onPress={() => onStep(current - 1)} />
      <TextButton label="Next" disabled={current >= steps.length - 1 || !steps.length} onPress={() => onStep(current + 1)} />
      <TextButton label="End" onPress={onEnd} />
    </View>
  </Animated.View>;
}

function IconButton({ icon, label, onPress }: { icon: 'times' | 'exchange-alt'; label: string; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
    <FontAwesome5 name={icon} size={16} color={colors.text} />
  </Pressable>;
}

function TextButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.textButton, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', zIndex: 6, backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typeScale.section, flex: 1, color: colors.text },
  summary: { ...typeScale.label, color: colors.primary },
  caption: { ...typeScale.caption, color: colors.textMuted },
  body: { ...typeScale.body, color: colors.text, flex: 1 },
  copy: { flex: 1, gap: spacing.xs },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 52, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  from: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fromText: { ...typeScale.label, color: colors.primary, flexShrink: 1 },
  steps: { flex: 1 },
  stepContent: { gap: spacing.xs },
  step: { minHeight: 52, padding: spacing.sm, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  current: { backgroundColor: colors.accentSoft, borderLeftWidth: 3, borderLeftColor: colors.accent },
  number: { ...typeScale.mono, color: colors.textMuted },
  stepText: { ...typeScale.body, color: colors.text, flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.sm },
  textButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  buttonText: { ...typeScale.label, color: colors.primary },
  disabled: { opacity: 0.4 },
}));
