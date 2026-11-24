import { describe, expect, it } from '@jest/globals';

import type { Stamp } from '@/backend/types';
import type { StampChallenge, StampTarget } from '@/data/types';
import { makeGuestState } from '@/backend/state';
import { passportProgress, withStamp } from '@/lib/passport';

const targets: StampTarget[] = [
  { id: 'place:a', kind: 'place', refId: 'a', title: 'A', points: 10 },
  { id: 'place:b', kind: 'place', refId: 'b', title: 'B', points: 10 },
  { id: 'sponsor:c', kind: 'sponsor', refId: 'c', title: 'C', points: 15 },
  { id: 'side-event:d', kind: 'side-event', refId: 'd', title: 'D', points: 20 },
];

const challenges: StampChallenge[] = [
  { id: 'ch1', title: 'Two places', description: '', rule: { kind: 'place', count: 2 }, bonus: 25 },
  { id: 'ch2', title: 'Any three', description: '', rule: { kind: 'any', count: 3 }, bonus: 50 },
];

describe('passportProgress', () => {
  it('sums stamp points and completed challenge bonuses', () => {
    const stamps: Stamp[] = [
      { targetId: 'place:a', at: 't1' },
      { targetId: 'place:b', at: 't2' },
      { targetId: 'sponsor:c', at: 't3' },
    ];
    const progress = passportProgress(stamps, targets, challenges);
    expect(progress.points).toBe(10 + 10 + 15 + 25 + 50);
    expect(progress.collected).toBe(3);
    expect(progress.total).toBe(4);
    expect(progress.challenges).toMatchObject([
      { id: 'ch1', done: true, progress: 2, goal: 2, bonus: 25 },
      { id: 'ch2', done: true, progress: 3, goal: 3, bonus: 50 },
    ]);
  });

  it('ignores duplicate stamps and unknown targets', () => {
    const stamps: Stamp[] = [
      { targetId: 'place:a', at: 't1' },
      { targetId: 'place:a', at: 't2' },
      { targetId: 'unknown:x', at: 't3' },
    ];
    const progress = passportProgress(stamps, targets, challenges);
    expect(progress.collected).toBe(1);
    expect(progress.points).toBe(10);
  });

  it('does not award an incomplete challenge', () => {
    const stamps: Stamp[] = [{ targetId: 'place:a', at: 't1' }];
    const progress = passportProgress(stamps, targets, challenges);
    expect(progress.challenges[0].done).toBe(false);
    expect(progress.challenges[0].progress).toBe(1);
    expect(progress.points).toBe(10);
  });
});

describe('withStamp', () => {
  it('adds the stamp and a "Stamp collected" activity line for any target kind, once', () => {
    const state = withStamp(makeGuestState(), 'sponsor:c', targets, 't1', 'act-1');
    expect(state.stamps).toEqual([{ targetId: 'sponsor:c', at: 't1' }]);
    expect(state.activity[0]).toMatchObject({ id: 'act-1', kind: 'stamp', title: 'Stamp collected: C' });
    expect(withStamp(state, 'sponsor:c', targets, 't2', 'act-2')).toBe(state);
  });

  it('ignores an unknown target', () => {
    const state = makeGuestState();
    expect(withStamp(state, 'place:zzz', targets, 't1', 'act-1')).toBe(state);
  });
});
