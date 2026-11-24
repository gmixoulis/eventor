import { describe, expect, it, jest } from '@jest/globals';

import { makeGuestState } from '@/backend/state';
import { withDemoClock } from '@/store/event-clock';

jest.mock('@/backend/api', () => ({ api: {} }));

describe('withDemoClock', () => {
  it('sets the clock and clears dismissed reminders, for a preset and for real time', () => {
    const state = { ...makeGuestState(), dismissedReminders: ['session:a'] };
    const clock = { anchor: '2026-05-27T09:30', startedAt: '2026-11-20T08:00:00.000Z' };
    const next = withDemoClock(state, clock);
    expect(next.settings.demoClock).toEqual(clock);
    expect(next.dismissedReminders).toEqual([]);
    expect(withDemoClock(state, null)).toMatchObject({ dismissedReminders: [], settings: { demoClock: null } });
  });
});
