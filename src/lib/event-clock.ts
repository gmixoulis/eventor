import type { Settings } from '@/backend/types';
// The seed module directly, not '@/data': lib/format builds on this file and data/slots imports lib/format.
import { event } from '@/data/seed';

/** Demo clock: the event dates are in the past, so the app can pretend it is any moment. */
export type DemoClock = Settings['demoClock'];

let wallFormat: Intl.DateTimeFormat | null = null;

/** The calendar parts of an instant on a clock in the event's timezone, as zero-padded strings. */
function wallParts(date: Date): Record<string, string> {
  wallFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of wallFormat.formatToParts(date)) parts[p.type] = p.value;
  // Some engines print midnight as 24 even with hour12 off.
  if (parts.hour === '24') parts.hour = '00';
  return parts;
}

/** The event wall clock at an instant, as { day: "YYYY-MM-DD", time: "HH:MM" }. */
export function eventWallClock(now: Date): { day: string; time: string } {
  const p = wallParts(now);
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** How far the event timezone is ahead of UTC at the given instant, in ms. */
function eventOffsetMs(utcMs: number): number {
  const p = wallParts(new Date(utcMs));
  const wallAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return wallAsUtc - Math.floor(utcMs / 60000) * 60000;
}

/**
 * The instant (epoch ms) of an event wall time "YYYY-MM-DDTHH:mm" in the event's timezone,
 * the same on every device whatever its own timezone.
 */
export function wallTimeMs(wall: string): number {
  const asUtc = Date.parse(`${wall}:00Z`);
  // Second pass corrects the offset when the first guess lands across a DST change.
  return asUtc - eventOffsetMs(asUtc - eventOffsetMs(asUtc));
}

/**
 * The event "now". With a demo clock, returns the anchor (event wall time) plus the real
 * time elapsed since the clock started; with null, returns the real now untouched.
 */
export function eventNow(demoClock: DemoClock, realNow: Date): Date {
  if (demoClock === null) return realNow;
  const started = Date.parse(demoClock.startedAt);
  return new Date(wallTimeMs(demoClock.anchor) + (realNow.getTime() - started));
}

export type DemoClockPreset = { id: string; anchor: string };

/** Demo moments to jump to; choosing "Real time" in the UI means `setPreset(null)`. */
export const DEMO_CLOCK_PRESETS: DemoClockPreset[] = [
  { id: 'day-1-0930', anchor: '2026-05-27T09:30' },
  { id: 'day-2-1005', anchor: '2026-05-28T10:05' },
  { id: 'day-2-1425', anchor: '2026-05-28T14:25' },
  { id: 'day-3-1645', anchor: '2026-05-29T16:45' },
];

/**
 * Restarts a preset clock at its anchor, so opening the app always shows the chosen moment
 * instead of drifting past the festival. Real time and custom anchors are returned unchanged.
 */
export function restartDemoClock(demoClock: DemoClock, realNow: Date): DemoClock {
  if (demoClock === null || !DEMO_CLOCK_PRESETS.some((p) => p.anchor === demoClock.anchor)) {
    return demoClock;
  }
  return { anchor: demoClock.anchor, startedAt: realNow.toISOString() };
}

/** Label for the real-time option shown next to the presets. */
export const REAL_TIME_LABEL = 'Real time';
