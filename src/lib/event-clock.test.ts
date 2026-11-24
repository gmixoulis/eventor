import { describe, expect, it } from '@jest/globals';

import { eventNow, restartDemoClock, wallTimeMs } from '@/lib/event-clock';

describe('restartDemoClock', () => {
  const real = new Date('2026-11-22T08:00:00.000Z');

  it('restarts a preset at its anchor, so a reopened app shows the chosen moment', () => {
    const stale = { anchor: '2026-05-28T10:05', startedAt: '2026-11-20T08:00:00.000Z' };
    const restarted = restartDemoClock(stale, real);
    expect(restarted).toEqual({ anchor: '2026-05-28T10:05', startedAt: real.toISOString() });
    expect(eventNow(restarted, real).getTime()).toBe(wallTimeMs('2026-05-28T10:05'));
  });

  it('leaves real time and a custom anchor untouched', () => {
    expect(restartDemoClock(null, real)).toBeNull();
    const custom = { anchor: '2026-05-28T12:00', startedAt: '2026-11-20T08:00:00.000Z' };
    expect(restartDemoClock(custom, real)).toBe(custom);
  });
});

describe('wallTimeMs', () => {
  it('reads event wall time in New York, summer and winter', () => {
    expect(wallTimeMs('2026-05-28T10:00')).toBe(Date.UTC(2026, 4, 28, 14, 0));
    expect(wallTimeMs('2026-01-10T10:00')).toBe(Date.UTC(2026, 0, 10, 15, 0));
  });
});

describe('eventNow', () => {
  it('returns real now without a demo clock', () => {
    const real = new Date(Date.UTC(2026, 10, 20, 12, 0));
    expect(eventNow(null, real)).toBe(real);
  });

  it('adds the real time elapsed since the clock started to the anchor', () => {
    const startedAt = '2026-11-20T12:00:00.000Z';
    const real = new Date(Date.parse(startedAt) + 7 * 60000);
    const now = eventNow({ anchor: '2026-05-28T10:05', startedAt }, real);
    expect(now.getTime()).toBe(wallTimeMs('2026-05-28T10:12'));
  });
});
