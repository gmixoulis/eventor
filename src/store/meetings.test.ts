import { describe, expect, it, jest } from '@jest/globals';

import type { Meeting } from '@/backend/types';
import { slotPlace } from '@/data';

import { meetingActivity, rescheduled } from './meetings';

jest.mock('@/backend/api', () => ({ api: {} }));

const meeting: Meeting = {
  id: 'm1',
  createdAt: '2027-01-01T00:00:00.000Z',
  personId: 'p1',
  name: 'Ada',
  company: 'Co',
  title: 'CTO',
  role: 'Investor',
  start: '10:00',
  duration: 15,
  place: slotPlace(1),
  status: 'accepted',
  direction: 'outbound',
};

describe('rescheduled', () => {
  it('moves start and place, and the activity entry carries both', () => {
    const moved = rescheduled(meeting, '11:00', { table: 2 });
    const activity = meetingActivity(moved, 'rescheduled');
    expect(moved.place).toBe(slotPlace(2));
    expect(activity.meetingStart).toBe('11:00');
    expect(activity.place).toBe(slotPlace(2));
    expect(activity.place).not.toBe(meeting.place);
  });

  it('keeps the place when only the time changes', () => {
    expect(rescheduled(meeting, '11:00').place).toBe(meeting.place);
  });
});
