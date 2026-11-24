import { describe, expect, it } from '@jest/globals';

import {
  groupByTime,
  overlaps,
  sessionLength,
} from '@/components/schedule/agenda-math';
import type { Session } from '@/data/types';

function sess(
  id: string,
  startTime: string,
  endTime: string,
  dayId = '2026-05-28',
  extra: Partial<Session> = {},
): Session {
  return {
    id,
    title: `Session ${id}`,
    description: '',
    dayId,
    stageId: 'stage-hudson',
    startTime,
    endTime,
    speakerIds: [],
    trackId: 'track-ai',
    tagIds: [],
    ...extra,
  };
}

describe('groupByTime', () => {
  it('groups sessions with the same start time into one section', () => {
    const result = groupByTime([
      sess('a', '09:00', '09:30'),
      sess('b', '09:00', '10:00'),
      sess('c', '11:00', '11:30'),
    ]);
    expect(result.sections.map((s) => s.startTime)).toEqual(['09:00', '11:00']);
    expect(result.sections[0].sessions.map((s) => s.id).sort()).toEqual(['a', 'b']);
  });

  it('sorts sections by time regardless of input order', () => {
    const result = groupByTime([
      sess('a', '11:00', '11:30'),
      sess('b', '09:00', '09:30'),
    ]);
    expect(result.sections.map((s) => s.startTime)).toEqual(['09:00', '11:00']);
  });

  it('separates all-day sessions out of the time sections', () => {
    const result = groupByTime([
      sess('a', '09:00', '09:30'),
      sess('side', '09:00', '23:00', '2026-05-28', { allDay: true }),
      sess('long', '09:00', '16:00'),
    ]);
    expect(result.allDay.map((s) => s.id).sort()).toEqual(['long', 'side']);
    expect(result.sections).toEqual([
      expect.objectContaining({ startTime: '09:00' }),
    ]);
    expect(result.sections[0].sessions.map((s) => s.id)).toEqual(['a']);
  });
});

describe('overlaps', () => {
  it('detects two overlapping windows', () => {
    expect(
      overlaps(
        { dayId: '2026-05-28', startTime: '09:00', endTime: '10:00' },
        { dayId: '2026-05-28', startTime: '09:30', endTime: '10:30' },
      ),
    ).toBe(true);
  });

  it('treats touching end-to-start as not an overlap', () => {
    expect(
      overlaps(
        { dayId: '2026-05-28', startTime: '09:00', endTime: '10:00' },
        { dayId: '2026-05-28', startTime: '10:00', endTime: '11:00' },
      ),
    ).toBe(false);
  });

  it('never overlaps across different days', () => {
    expect(
      overlaps(
        { dayId: '2026-05-28', startTime: '09:00', endTime: '10:00' },
        { dayId: '2026-05-29', startTime: '09:00', endTime: '10:00' },
      ),
    ).toBe(false);
  });
});

describe('sessionLength', () => {
  it('formats a sub-hour duration in minutes', () => {
    expect(sessionLength('09:30', '10:15')).toBe('45 min');
  });

  it('formats an hour and a half', () => {
    expect(sessionLength('09:00', '10:30')).toBe('1 h 30 min');
  });

  it('formats a whole hour without minutes', () => {
    expect(sessionLength('09:00', '11:00')).toBe('2 h');
  });
});
