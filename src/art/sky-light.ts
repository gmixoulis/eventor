// The light over New York, by the event clock (the event timezone, never the device zone).
// Colors are interpolated linearly between hourly keyframes, wrapping at midnight, so they never jump.
//
// contrastSafe: tints are low-alpha washes layered over `bg`. src/art/art.test.ts composites every
// keyframe over lightColors.bg and darkColors.bg and checks `text` and `textMuted` still reach
// WCAG AA 4.5:1 in both themes. Keep alpha at or under 0.08 in light: night at 0.12 measured 4.49:1
// for textMuted.
import { eventWallClock } from '@/lib/event-clock';

export type SkyPhase = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

type Rgba = [number, number, number, number];
type Keyframe = { hour: number; tint: Rgba };

export const SKY_KEYFRAMES: Keyframe[] = [
  { hour: 0, tint: [38, 54, 140, 0.08] },
  { hour: 6, tint: [255, 140, 110, 0.08] },
  { hour: 9, tint: [255, 200, 90, 0.07] },
  { hour: 13, tint: [90, 160, 255, 0.06] },
  { hour: 16, tint: [255, 180, 70, 0.07] },
  { hour: 19, tint: [210, 90, 130, 0.08] },
  { hour: 22, tint: [38, 54, 140, 0.08] },
  { hour: 24, tint: [38, 54, 140, 0.08] },
];

/** Representative New York hour for each phase (used by the gallery). */
export const PHASE_HOURS: Record<SkyPhase, number> = {
  dawn: 6,
  morning: 9,
  noon: 13,
  afternoon: 16,
  dusk: 19.5,
  night: 23,
};

/** Fractional hour of day in New York, 0 to under 24. */
export function cityHour(date: Date): number {
  const [hour, minute] = eventWallClock(date).time.split(':').map(Number);
  // The event zone is offset by whole minutes, so UTC seconds are its seconds too.
  return hour + minute / 60 + date.getUTCSeconds() / 3600;
}

function mix(a: Rgba, b: Rgba, t: number): Rgba {
  return [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t) as Rgba;
}

/** The interpolated tint at an New York hour, as [r, g, b, alpha]. */
export function tintAtHour(hour: number): Rgba {
  const h = ((hour % 24) + 24) % 24;
  const i = SKY_KEYFRAMES.findIndex((k) => k.hour > h);
  const next = SKY_KEYFRAMES[i];
  const prev = SKY_KEYFRAMES[i - 1];
  return mix(prev.tint, next.tint, (h - prev.hour) / (next.hour - prev.hour));
}
