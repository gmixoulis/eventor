import { itemEndMs, itemStartMs, type AgendaItem } from '@/lib/agenda-item';
import { formatDuration } from '@/lib/format';
import { hashString } from '@/lib/utils';

export type LivePhase = 'upcoming' | 'live' | 'ended';
export type LiveLevel = 'open' | 'filling' | 'full' | 'none';

export type LiveStatus = {
  phase: LivePhase;
  level: LiveLevel;
  taken: number;
  capacity: number | null;
  label: string;
};

/** A per-item share of capacity that "walks in" by the start, between 20 and 70 percent; hashed, so the same item always simulates the same crowd. */
function walkInShare(key: string): number {
  return 0.2 + (hashString(key) % 51) / 100;
}

function seats(n: number): string {
  return n === 1 ? '1 seat' : `${n} seats`;
}

/** Upcoming, live or ended at nowMs, with no seat counts. */
export function phaseOf(item: AgendaItem, nowMs: number): LivePhase {
  if (nowMs < itemStartMs(item)) return 'upcoming';
  if (nowMs < itemEndMs(item)) return 'live';
  return 'ended';
}

/** "Starts in 5 min", "Live now" or "Ended": the timing words without seats. */
export function timingLabel(item: AgendaItem, now: Date): string {
  const nowMs = now.getTime();
  const phase = phaseOf(item, nowMs);
  if (phase === 'live') return 'Live now';
  if (phase === 'ended') return 'Ended';
  return `Starts in ${formatDuration(Math.max(1, Math.round((itemStartMs(item) - nowMs) / 60000)))}`;
}

/**
 * Deterministic simulated walk-ins: 0 until 45 minutes before the start, rising to the
 * item's share of capacity by the start. 0 for an item without a capacity.
 */
export function walkInSeats(item: AgendaItem, now: Date): number {
  const capacity = item.capacity ?? 0;
  const minutesUntil = (itemStartMs(item) - now.getTime()) / 60000;
  if (minutesUntil <= 0) return Math.round(capacity * walkInShare(item.key));
  if (minutesUntil < 45) return Math.round(capacity * walkInShare(item.key) * (1 - minutesUntil / 45));
  return 0;
}

/**
 * The one rule for taken seats, shared by the live status and the reserve API: reserved
 * seats plus simulated walk-ins, never above capacity. Full means taken === capacity.
 */
export function takenSeats(capacity: number, reserved: number, walkIns: number): number {
  return Math.min(capacity, reserved + walkIns);
}

/**
 * Simulated live status for one agenda item. `taken` is the reserved count plus the
 * walk-in estimate (see walkInSeats). No capacity means no level and a phase label.
 */
export function liveStatus(item: AgendaItem, now: Date, reserved: number): LiveStatus {
  const nowMs = now.getTime();
  const phase = phaseOf(item, nowMs);
  const capacity = item.capacity ?? null;

  if (capacity === null) {
    return { phase, level: 'none', taken: reserved, capacity: null, label: timingLabel(item, now) };
  }

  const taken = takenSeats(capacity, reserved, walkInSeats(item, now));
  const seatsLeft = Math.max(0, capacity - taken);
  const level: LiveLevel =
    taken >= capacity ? 'full' : taken >= capacity * 0.7 ? 'filling' : 'open';

  const label =
    phase === 'ended'
      ? 'Ended'
      : level === 'full'
        ? 'Full'
        : level === 'filling'
          ? `Filling up · ${seats(seatsLeft)} left`
          : `Open · ${seatsLeft} of ${seats(capacity)} left`;

  return { phase, level, taken, capacity, label };
}
