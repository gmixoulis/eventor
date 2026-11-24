import { describe, expect, it } from '@jest/globals';

import { computeRange, positionSession } from '@/components/schedule/math';
import type { Session } from '@/data/types';

function sess(startTime: string, endTime: string): Session {
  return {
    id: '',
    title: '',
    description: '',
    dayId: '',
    stageId: '',
    startTime,
    endTime,
    speakerIds: [],
    trackId: '',
    tagIds: [],
  };
}

describe('positionSession', () => {
  it('positions a session fully inside the range', () => {
    // 10:00 - 10:30 with a range starting at 09:30: one slot over, one slot wide.
    expect(positionSession('10:00', '10:30', '09:30')).toEqual({ left: 76, width: 74 });
  });

  it('clips a session that starts before the range', () => {
    // 09:00 - 10:00 with a range starting at 09:30: only the 09:30..10:00 part shows.
    expect(positionSession('09:00', '10:00', '09:30')).toEqual({ left: 0, width: 74 });
  });

  it('gives a zero-length session zero width', () => {
    const result = positionSession('10:00', '10:00', '09:30');
    expect(result.left).toBe(76);
    expect(result.width).toBe(0);
  });

  it('never returns negative left or width', () => {
    const result = positionSession('09:00', '09:00', '09:30');
    expect(result.left).toBeGreaterThanOrEqual(0);
    expect(result.width).toBeGreaterThanOrEqual(0);
  });
});

describe('computeRange', () => {
  it('rounds the earliest start down and the latest end up', () => {
    const range = computeRange([sess('09:50', '10:12'), sess('11:05', '11:20')]);
    expect(range).toEqual({ start: '09:30', end: '11:30' });
  });

  it('returns null when there are no sessions', () => {
    expect(computeRange([])).toBeNull();
  });
});
