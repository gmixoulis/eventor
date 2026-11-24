import type { Fix } from '@/components/venue/location-fix';

/** Accuracy levels to try in order (values of expo-location's Accuracy enum), best first, down to what plain device GPS gives. */
export const ACCURACY_LEVELS = [6, 4, 3, 2] as const; // BestForNavigation, High, Balanced, Low
export const NO_FIX_AFTER_MS = 15000;
export const STALE_AFTER_MS = 2 * 60 * 1000;

export type LocationState = {
  permission: 'unknown' | 'undetermined' | 'denied' | 'granted';
  services: 'unknown' | 'on' | 'off';
  phase: 'idle' | 'waiting' | 'fix' | 'noFix';
  /** Index into ACCURACY_LEVELS for the active watch. */
  level: number;
  /** The person said no to the system accuracy dialog this session. */
  accuracyDeclined: boolean;
  fix?: Fix;
  /** The fix came from the running watch, not from the last-known cache. */
  live: boolean;
};

export type LocationAction =
  | { type: 'permission'; granted: boolean; canAskAgain: boolean }
  | { type: 'services'; enabled: boolean }
  | { type: 'fix'; fix: Fix; live: boolean }
  | { type: 'timeout' }
  | { type: 'watchFailed' }
  | { type: 'accuracyResult'; enabled: boolean };

export function initialLocationState(accuracyDeclined = false): LocationState {
  return { permission: 'unknown', services: 'unknown', phase: 'idle', level: 0, accuracyDeclined, live: false };
}

const lower = (level: number) => Math.min(level + 1, ACCURACY_LEVELS.length - 1);

export function locationReducer(state: LocationState, action: LocationAction): LocationState {
  switch (action.type) {
    case 'permission':
      if (!action.granted) return { ...state, permission: action.canAskAgain ? 'undetermined' : 'denied', phase: 'idle', fix: undefined, live: false };
      return { ...state, permission: 'granted', phase: state.phase === 'idle' ? 'waiting' : state.phase };
    case 'services':
      return { ...state, services: action.enabled ? 'on' : 'off', phase: action.enabled ? (state.live ? 'fix' : 'waiting') : 'idle' };
    case 'fix':
      // A cached fix never replaces a live one.
      if (!action.live && state.live) return state;
      return { ...state, phase: action.live || state.phase !== 'noFix' ? 'fix' : 'noFix', fix: action.fix, live: action.live };
    case 'timeout':
      // No live fix in time: say so (a cached fix stays on screen) and try a less demanding level.
      return state.live || state.phase === 'idle' ? state : { ...state, phase: 'noFix', level: lower(state.level) };
    case 'watchFailed': {
      const last = state.level === ACCURACY_LEVELS.length - 1;
      return { ...state, level: lower(state.level), phase: state.live ? 'fix' : last ? 'noFix' : state.phase === 'noFix' ? 'noFix' : 'waiting' };
    }
    case 'accuracyResult':
      return action.enabled
        ? { ...state, accuracyDeclined: false, level: 0, phase: state.live ? 'fix' : 'waiting' }
        : { ...state, accuracyDeclined: true };
  }
}
