import { describe, expect, it, jest } from '@jest/globals';

import { makeGuestState } from '@/backend/state';
import { withoutReservation } from '@/store/reservations';

jest.mock('@/backend/api', () => ({ api: {} }));

describe('withoutReservation', () => {
  it('drops the reservation and its reminder but keeps the item in the agenda', () => {
    const key = 'side-event:se-ai-workshop';
    const base = makeGuestState();
    const state = {
      ...base,
      reservations: [{ key, status: 'waitlist' as const, createdAt: 't1' }],
      reminders: [key, 'session:other'],
      mySideEvents: ['se-ai-workshop'],
    };
    const next = withoutReservation(state, key);
    expect(next.reservations).toEqual([]);
    expect(next.reminders).toEqual(['session:other']);
    expect(next.mySideEvents).toEqual(['se-ai-workshop']);
  });
});
