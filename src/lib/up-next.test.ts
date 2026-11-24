import { describe, expect, it } from '@jest/globals';

import { agendaKey, type AgendaItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { upNext } from '@/lib/up-next';

function item(id: string, startTime: string, endTime: string): AgendaItem {
  return {
    key: agendaKey('session', id),
    kind: 'session',
    id,
    title: id,
    day: '2026-05-28',
    startTime,
    endTime,
    place: 'Stage',
  };
}

const now = new Date(wallTimeMs('2026-05-28T10:00'));

describe('upNext', () => {
  it('handles an empty list', () => {
    expect(upNext([], now)).toEqual({ current: null, next: null, later: [] });
  });

  it('returns nothing when everything is past', () => {
    expect(upNext([item('s1', '08:00', '08:30')], now)).toEqual({
      current: null,
      next: null,
      later: [],
    });
  });

  it('reports one item in progress', () => {
    const result = upNext([item('s1', '09:45', '10:15')], now);
    expect(result.current?.id).toBe('s1');
    expect(result.next).toBeNull();
  });

  it('breaks ties at the same start by title', () => {
    const result = upNext([item('b', '11:00', '11:30'), item('a', '11:00', '11:30')], now);
    expect(result.next?.id).toBe('a');
  });

  it('puts the two items after next into later', () => {
    const items = [
      item('s1', '11:00', '11:30'),
      item('s2', '12:00', '12:30'),
      item('s3', '13:00', '13:30'),
    ];
    const result = upNext(items, now);
    expect(result.next?.id).toBe('s1');
    expect(result.later.map((i) => i.id)).toEqual(['s2', 's3']);
  });
});
