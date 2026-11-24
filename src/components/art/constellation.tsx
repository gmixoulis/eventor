import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import type { ConstellationLayout, Star } from '@/art/constellation';
import { glintPath } from '@/art/ornament';
import { n2, seeded } from '@/art/random';
import { makeStyles, useTheme } from '@/components/theme';
import { CSS_EASE_OUT, EASE_OUT } from '@/constants/motion';
import { radius, spacing, typeScale, type Theme } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** Figure reveal when a group completes: a rare, earned moment, so it gets a longer draw. */
const FIGURE_MS = 700;
const PULSE_MS = 650;
const TARGET = 44;

/**
 * Sky tokens: the panel is ink in light (`text` ground, `bg` stars) and `surfaceRaised` in dark
 * (`text` stars), so it reads as night in both without borrowing the action blue. Glints, figures
 * and halos use `accent` (sun yellow) in both themes.
 */
export function skyColors({ colors, scheme }: Theme): { ground: string; star: string; glint: string } {
  return scheme === 'dark'
    ? { ground: colors.surfaceRaised, star: colors.text, glint: colors.accent }
    : { ground: colors.text, star: colors.bg, glint: colors.accent };
}

type Props = {
  layout: ConstellationLayout;
  collected: string[];
  completedGroups: string[];
  /** Width in dp; height follows the layout's aspect. */
  size: number;
  /** When set, every star becomes a 44 dp button. */
  onPressStar?: (id: string) => void;
  /** Screen reader label per star, for example "Opening keynote, collected". */
  starLabel?: (id: string, collected: boolean) => string;
  /** Rounded panel corners; off when the caller frames it (the share card). */
  framed?: boolean;
  /** A short line inside the panel under the sky, for example the invitation at zero stamps. */
  hint?: string;
};

function figurePath(stars: Star[]): { d: string; length: number } {
  let length = 0;
  const d = stars
    .map((s, i) => {
      if (i) length += Math.hypot(s.x - stars[i - 1].x, s.y - stars[i - 1].y);
      return `${i ? 'L' : 'M'}${n2(s.x)} ${n2(s.y)}`;
    })
    .join(' ');
  return { d, length };
}

function Figure({ d, length, color, width }: { d: string; length: number; color: string; width: number }) {
  const reduced = useReducedMotion();
  const drawn = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) drawn.set(withTiming(1, { duration: FIGURE_MS, easing: EASE_OUT }));
  }, [drawn, reduced]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.get()) }));
  return (
    <AnimatedPath
      d={d}
      animatedProps={props}
      strokeDasharray={[length, length]}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const PULSE = {
  from: { opacity: 0.9, transform: [{ scale: 0.6 }] },
  to: { opacity: 0, transform: [{ scale: 2.4 }] },
};
const PULSE_FADE = { from: { opacity: 0.9 }, to: { opacity: 0 } };

/**
 * Passport constellation. Every figure is drawn as faint solid links from the start, so an empty sky
 * already shows what there is to fill; collected stars turn into sun-yellow glints with a soft
 * halo, and a figure is drawn in gold once its group is complete.
 */
export function Constellation({ layout, collected, completedGroups, size, onPressStar, starLabel, framed = true, hint }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const sky = skyColors(theme);
  const scale = size / layout.width;
  const height = layout.height * scale;
  const k = 1 / scale;

  // Stars that were not collected on the previous change play a one-time pulse.
  const collectedKey = collected.join('|');
  const [seen, setSeen] = useState(collectedKey);
  const [fresh, setFresh] = useState<string[]>([]);
  if (seen !== collectedKey) {
    const before = new Set(seen.split('|'));
    setFresh(collected.filter((id) => !before.has(id)));
    setSeen(collectedKey);
  }

  const have = new Set(collected);
  const done = new Set(completedGroups);
  const byId = new Map(layout.stars.map((s) => [s.id, s]));

  const rand = seeded(`dust:${layout.width}x${layout.height}:${layout.stars.length}`);
  const dust = Array.from({ length: 36 }, () => ({ x: rand() * layout.width, y: rand() * layout.height, r: 0.4 + rand() * 0.6 }));

  const figures = [...new Set(layout.stars.map((s) => s.kind))].map((group) => ({
    group,
    ...figurePath(layout.stars.filter((s) => s.kind === group)),
  }));

  return (
    <View style={[{ width: size, backgroundColor: sky.ground }, framed && styles.framed]}>
      <Svg width={size} height={height} viewBox={`0 0 ${layout.width} ${layout.height}`} accessible={false}>
        {dust.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.r * k} fill={sky.star} opacity={0.18} />
        ))}
        {figures
          .filter((f) => !done.has(f.group))
          .map((f) => (
            <Path key={`sketch-${f.group}`} d={f.d} fill="none" stroke={sky.star} strokeOpacity={0.3} strokeWidth={k}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}
        {figures
          .filter((f) => done.has(f.group))
          .map((f) => (
            <Path key={`halo-${f.group}`} d={f.d} fill="none" stroke={sky.glint} strokeOpacity={0.22} strokeWidth={9 * k} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        {layout.links.map((l) => {
          const a = byId.get(l.from);
          const b = byId.get(l.to);
          if (!a || !b || !have.has(a.id) || !have.has(b.id) || done.has(l.group)) return null;
          return <Line key={`${l.from}-${l.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={sky.star} strokeOpacity={0.65} strokeWidth={1.2 * k} />;
        })}
        {figures
          .filter((f) => done.has(f.group))
          .map((f) => (
            <Figure key={`fig-${f.group}`} d={f.d} length={f.length} color={sky.glint} width={1.6 * k} />
          ))}
        {layout.stars.map((s) =>
          have.has(s.id) ? (
            <G key={s.id}>
              <Circle cx={s.x} cy={s.y} r={(8 + s.magnitude * 3) * k} fill={sky.glint} opacity={0.24} />
              <Path d={glintPath(s.x, s.y, (5 + s.magnitude * 3) * k)} fill={sky.glint} />
            </G>
          ) : (
            // Uncollected: a solid dot with a soft ring, so the empty sky still reads as stars to find.
            <G key={s.id}>
              <Circle cx={s.x} cy={s.y} r={(6 + s.magnitude) * k} fill="none" stroke={sky.star} strokeOpacity={0.35} strokeWidth={k} />
              <Circle cx={s.x} cy={s.y} r={(2.4 + s.magnitude * 1.2) * k} fill={sky.star} opacity={0.9} />
            </G>
          ),
        )}
      </Svg>

      {fresh.map((id) => {
        const s = byId.get(id);
        if (!s) return null;
        return (
          <Animated.View
            key={`pulse-${id}-${collectedKey}`}
            pointerEvents="none"
            style={[
              styles.pulse,
              {
                left: s.x * scale - 12,
                top: s.y * scale - 12,
                borderColor: sky.glint,
                animationName: reduced ? PULSE_FADE : PULSE,
                animationDuration: PULSE_MS,
                animationTimingFunction: CSS_EASE_OUT,
                animationFillMode: 'both',
              },
            ]}
          />
        );
      })}

      {onPressStar
        ? layout.stars.map((s, i) => {
            const isCollected = have.has(s.id);
            return (
              <Pressable
                key={`press-${s.id}`}
                onPress={() => onPressStar(s.id)}
                accessibilityRole="button"
                accessibilityLabel={starLabel?.(s.id, isCollected) ?? `Star ${i + 1}, ${isCollected ? 'collected' : 'not collected'}`}
                style={[styles.target, { left: s.x * scale - TARGET / 2, top: s.y * scale - TARGET / 2 }]}
              />
            );
          })
        : null}
      {hint ? <Text style={[styles.hint, { color: sky.star }]}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  framed: { borderRadius: radius.md, overflow: 'hidden' },
  pulse: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 1.5 },
  target: { position: 'absolute', width: TARGET, height: TARGET },
  hint: { ...typeScale.body, textAlign: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
}));
