import { useSyncExternalStore } from 'react';

import type { StoreState } from '@/backend/types';
import { DEMO_CLOCK_PRESETS, eventNow, type DemoClock } from '@/lib/event-clock';
import { useStoreValue } from '@/store/context';

const TICK_MS = 30_000;

// One shared wall-clock store: a single interval serves every consumer.
let sharedNow = new Date();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick(): void {
  sharedNow = new Date();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    // Nobody was listening, so the last reading may be old: start from the real now.
    sharedNow = new Date();
    timer = setInterval(tick, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): Date {
  return sharedNow;
}

/** A new demo clock moment; reminders dismissed at the old moment can show again. */
export function withDemoClock(state: StoreState, demoClock: DemoClock): StoreState {
  return { ...state, settings: { ...state.settings, demoClock }, dismissedReminders: [] };
}

export type EventClock = {
  /** The event "now" as a real instant; read event wall time with eventWallClock(now). */
  now: Date;
  isDemo: boolean;
  /** The preset whose anchor the demo clock uses, or null for real time or a custom anchor. */
  presetId: string | null;
  /** Jump to a preset (restarting it from its anchor), or null for real time. */
  setPreset: (id: string | null) => void;
};

/** The event "now", ticking every 30 seconds, driven by the demo clock in settings. */
export function useEventClock(): EventClock {
  const { state, setState } = useStoreValue();
  const realNow = useSyncExternalStore(subscribe, getSnapshot);
  const demoClock = state.settings.demoClock;
  // The compiler keeps this Date stable between ticks, so consumers can use it as an effect dependency.
  const now = eventNow(demoClock, realNow);

  const setPreset = (id: string | null) => {
    const found = DEMO_CLOCK_PRESETS.find((p) => p.id === id);
    if (id !== null && !found) return;
    const next = found ? { anchor: found.anchor, startedAt: new Date().toISOString() } : null;
    setState((s) => withDemoClock(s, next));
  };

  return {
    now,
    isDemo: demoClock !== null,
    presetId: DEMO_CLOCK_PRESETS.find((p) => p.anchor === demoClock?.anchor)?.id ?? null,
    setPreset,
  };
}
