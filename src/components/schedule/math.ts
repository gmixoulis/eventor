import { themes, type Scheme } from '@/constants/theme';
import type { Session } from '@/data/types';
import { minutesToTime, toMinutes } from '@/lib/format';

export const SLOT_MINUTES = 30;
export const PX_PER_SLOT = 76;
export const LEFT_COL_WIDTH = 92;
export const AXIS_HEIGHT = 32;

/** Earliest start rounded down to 30m and latest end rounded up, or null. */
export function computeRange(sessions: Session[]): { start: string; end: string } | null {
  if (sessions.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const s of sessions) {
    min = Math.min(min, toMinutes(s.startTime));
    max = Math.max(max, toMinutes(s.endTime));
  }
  const start = Math.floor(min / SLOT_MINUTES) * SLOT_MINUTES;
  const end = Math.ceil(max / SLOT_MINUTES) * SLOT_MINUTES;
  return { start: minutesToTime(start), end: minutesToTime(end) };
}

/**
 * Absolute position of a session card inside its stage row.
 * start/end/rangeStart are "HH:MM". left and width are in dp.
 * A session starting before the range is clipped at the range start;
 * a zero-length session has width 0.
 */
export function positionSession(
  start: string,
  end: string,
  rangeStart: string,
): { left: number; width: number } {
  const range = toMinutes(rangeStart);
  const s = toMinutes(start);
  const e = toMinutes(end);
  const left = ((s - range) / SLOT_MINUTES) * PX_PER_SLOT;
  const visibleStart = Math.max(s, range);
  const visibleEnd = Math.max(e, visibleStart);
  const width = ((visibleEnd - visibleStart) / SLOT_MINUTES) * PX_PER_SLOT - 2;
  return { left: Math.max(0, left), width: Math.max(0, width) };
}

type StageTint = { bg: string; border: string };

/** Card colors keyed by stage order; anything past the third is a side event. */
export function stageColor(order: number, scheme: Scheme): StageTint {
  const c = themes[scheme].colors;
  const tints = [
    { bg: c.stage1Bg, border: c.stage1Border },
    { bg: c.stage2Bg, border: c.stage2Border },
    { bg: c.stage3Bg, border: c.stage3Border },
  ];
  return tints[order - 1] ?? { bg: c.sideEventBg, border: c.sideEventBorder };
}
