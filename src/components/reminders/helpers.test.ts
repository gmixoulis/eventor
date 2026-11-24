import { describe, expect, it } from '@jest/globals';

import { hidesReminders, reminderText } from '@/components/reminders/helpers';
import type { AgendaItem } from '@/lib/agenda-item';
import type { Reminder } from '@/lib/reminders';

const item: AgendaItem = {
  key: 'session:a', kind: 'session', id: 'a', title: 'Build together',
  day: '2026-05-28', startTime: '10:00', endTime: '11:00', place: 'Cinema Stage',
};
const first: Reminder = { item, minutes: -1 };

describe('reminder copy', () => {
  it('shows minutes until the start, then started', () => {
    expect(reminderText({ item, minutes: 8 })).toBe('Build together starts in 8 min');
    expect(reminderText({ item, minutes: 1 })).toBe('Build together starts in 1 min');
    expect(reminderText({ item, minutes: 0 })).toBe('Build together has started');
    expect(reminderText(first)).toBe('Build together has started');
  });
  it('tells a waitlisted user they hold no seat yet', () => {
    expect(reminderText({ item, minutes: 8 }, true)).toBe('Build together starts in 8 min. You are on the waitlist');
    expect(reminderText(first, true)).toBe('Build together has started. You are on the waitlist');
  });
});

describe('immersive screens', () => {
  it('suppresses reminders only on the viewer and story routes', () => {
    expect(hidesReminders('/reels')).toBe(true);
    expect(hidesReminders('/reels/clip')).toBe(true);
    expect(hidesReminders('/announcements')).toBe(true);
    expect(hidesReminders('/')).toBe(false);
    expect(hidesReminders('/event-time')).toBe(false);
    expect(hidesReminders('/side-event/test')).toBe(false);
  });
});
