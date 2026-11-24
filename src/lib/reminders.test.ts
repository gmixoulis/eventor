import { describe, expect, it } from '@jest/globals';

import { agendaKey, type AgendaItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { dueReminders } from '@/lib/reminders';

function item(id: string, startTime: string): AgendaItem {
  return {
    key: agendaKey('session', id),
    kind: 'session',
    id,
    title: id,
    day: '2026-05-28',
    startTime,
    endTime: '23:59',
    place: 'Stage',
  };
}

const now = new Date(wallTimeMs('2026-05-28T10:00'));

describe('dueReminders', () => {
  it('includes items starting within the next 10 minutes', () => {
    const due = dueReminders([item('s1', '10:08')], ['session:s1'], [], now);
    expect(due).toHaveLength(1);
    expect(due[0].minutes).toBe(8);
  });

  it('includes just-started items with negative minutes', () => {
    const due = dueReminders([item('s1', '09:57')], ['session:s1'], [], now);
    expect(due).toHaveLength(1);
    expect(due[0].minutes).toBe(-3);
  });

  it('excludes dismissed items', () => {
    const due = dueReminders([item('s1', '10:05')], ['session:s1'], ['session:s1'], now);
    expect(due).toHaveLength(0);
  });

  it('excludes past items and items without a reminder', () => {
    expect(dueReminders([item('s1', '09:00')], ['session:s1'], [], now)).toHaveLength(0);
    expect(dueReminders([item('s1', '10:05')], [], [], now)).toHaveLength(0);
  });

  it('puts the soonest start first, ties by key', () => {
    const items = [item('s3', '10:06'), item('s2', '10:02'), item('s1', '10:06')];
    const due = dueReminders(items, items.map((i) => i.key), [], now);
    expect(due.map((d) => d.item.id)).toEqual(['s2', 's1', 's3']);
  });
});
