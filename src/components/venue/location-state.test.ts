import { describe, expect, it } from '@jest/globals';

import { accuracyLabel, type Fix } from '@/components/venue/location-fix';
import { ACCURACY_LEVELS, initialLocationState, locationReducer, type LocationAction, type LocationState } from '@/components/venue/location-state';
import { positionReadout } from '@/components/venue/position';

const fix: Fix = { lngLat: [23.7363, 37.9715], accuracy: 12, timestamp: 1 };
const run = (actions: LocationAction[], from = initialLocationState()) => actions.reduce(locationReducer, from);
const granted: LocationAction[] = [{ type: 'permission', granted: true, canAskAgain: true }, { type: 'services', enabled: true }];

describe('location state machine', () => {
  it('starts idle and waits once permission and services are on', () => {
    expect(initialLocationState()).toMatchObject({ permission: 'unknown', phase: 'idle', level: 0, accuracyDeclined: false });
    expect(run(granted)).toMatchObject({ permission: 'granted', services: 'on', phase: 'waiting' });
  });
  it('separates "not asked yet" from "denied for good"', () => {
    expect(run([{ type: 'permission', granted: false, canAskAgain: true }]).permission).toBe('undetermined');
    expect(run([{ type: 'permission', granted: false, canAskAgain: false }]).permission).toBe('denied');
  });
  it('stays idle with services off and recovers when they come back', () => {
    expect(run([...granted, { type: 'services', enabled: false }]).phase).toBe('idle');
    expect(run([...granted, { type: 'services', enabled: false }, { type: 'services', enabled: true }]).phase).toBe('waiting');
  });
  it('shows a live fix', () => {
    expect(run([...granted, { type: 'fix', fix, live: true }])).toMatchObject({ phase: 'fix', live: true, fix });
  });
  it('shows a cached fix quickly but never lets it replace a live one', () => {
    const cached = { ...fix, ageMinutes: 5 };
    expect(run([...granted, { type: 'fix', fix: cached, live: false }])).toMatchObject({ phase: 'fix', live: false });
    expect(run([...granted, { type: 'fix', fix, live: true }, { type: 'fix', fix: cached, live: false }]).fix).toBe(fix);
  });
  it('reports no fix after the timeout and steps down an accuracy level', () => {
    const state = run([...granted, { type: 'timeout' }]);
    expect(state).toMatchObject({ phase: 'noFix', level: 1 });
    expect(locationReducer(state, { type: 'fix', fix, live: true }).phase).toBe('fix');
    expect(run([...granted, { type: 'fix', fix, live: true }, { type: 'timeout' }]).phase).toBe('fix');
  });
  it('falls back through every level when the watch fails, then gives up with no fix', () => {
    let state: LocationState = run(granted);
    for (let i = 1; i < ACCURACY_LEVELS.length; i++) {
      state = locationReducer(state, { type: 'watchFailed' });
      expect(state).toMatchObject({ level: i, phase: 'waiting' });
    }
    state = locationReducer(state, { type: 'watchFailed' });
    expect(state).toMatchObject({ level: ACCURACY_LEVELS.length - 1, phase: 'noFix' });
  });
  it('remembers a declined accuracy dialog and resets the level when accepted', () => {
    const declined = run([...granted, { type: 'timeout' }, { type: 'accuracyResult', enabled: false }]);
    expect(declined).toMatchObject({ accuracyDeclined: true, level: 1, phase: 'noFix' });
    expect(initialLocationState(true).accuracyDeclined).toBe(true);
    expect(locationReducer(declined, { type: 'accuracyResult', enabled: true })).toMatchObject({ accuracyDeclined: false, level: 0, phase: 'waiting' });
  });
  it('drops the position when permission is revoked', () => {
    expect(run([...granted, { type: 'fix', fix, live: true }, { type: 'permission', granted: false, canAskAgain: false }])).toMatchObject({ phase: 'idle', fix: undefined });
  });
});

describe('readout for these states', () => {
  it('labels waiting, no fix and an old cached position', () => {
    expect(positionReadout(undefined, true).text).toBe('Finding your location');
    expect(positionReadout(undefined, true, true)).toEqual({ text: 'No GPS fix yet', low: true, simulated: false });
    expect(accuracyLabel({ ...fix, ageMinutes: 7 })).toEqual({ text: 'Last known position, 7 min old', low: true });
    expect(positionReadout({ ...fix, source: 'manual', label: 'Registration' }, true, true).text).toBe('Position set by you, at Registration');
  });
});
