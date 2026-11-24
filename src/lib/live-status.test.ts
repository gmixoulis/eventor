import { describe, expect, it } from '@jest/globals';

import { agendaKey, type AgendaItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { pad2 } from '@/lib/format';
import { liveStatus } from '@/lib/live-status';

function item(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    key: agendaKey('session', 's1'),
    kind: 'session',
    id: 's1',
    title: 'T',
    day: '2026-05-28',
    startTime: '10:00',
    endTime: '10:30',
    place: 'Stage',
    capacity: 40,
    ...overrides,
  };
}

const at = (hour: number, minute = 0): Date =>
  new Date(wallTimeMs(`2026-05-28T${pad2(hour)}:${pad2(minute)}`));

describe('liveStatus', () => {
  it('labels items with no capacity by phase', () => {
    const noCapacity = item({ capacity: undefined });
    expect(liveStatus(noCapacity, at(9, 35), 0)).toMatchObject({
      level: 'none',
      phase: 'upcoming',
      label: 'Starts in 25 min',
    });
    expect(liveStatus(noCapacity, at(10, 15), 0)).toMatchObject({
      phase: 'live',
      label: 'Live now',
    });
    expect(liveStatus(noCapacity, at(11, 0), 0)).toMatchObject({ phase: 'ended', label: 'Ended' });
    expect(liveStatus(noCapacity, at(1, 0), 0).label).toBe('Starts in 9 h');
  });

  it('reports open, filling and full from the reserved count', () => {
    // Two hours before the start, walk-ins are still 0, so taken equals reserved.
    const early = at(8, 0);
    expect(liveStatus(item({ capacity: 40 }), early, 0).level).toBe('open');
    expect(liveStatus(item({ capacity: 40 }), early, 28).level).toBe('filling');
    expect(liveStatus(item({ capacity: 40 }), early, 40).level).toBe('full');
    expect(liveStatus(item({ capacity: 40 }), early, 40).label).toBe('Full');
  });

  it('is deterministic and never exceeds capacity', () => {
    const target = item({ capacity: 40 });
    const first = liveStatus(target, at(10, 0), 0);
    const second = liveStatus(target, at(10, 0), 0);
    expect(first.taken).toBe(second.taken);
    expect(first.taken).toBeLessThanOrEqual(40);
  });

  it('labels an ended item with seats as Ended', () => {
    expect(liveStatus(item({ capacity: 40 }), at(23, 0), 10)).toMatchObject({ phase: 'ended', label: 'Ended' });
  });

  it('writes the open and filling labels', () => {
    const early = at(8, 0);
    expect(liveStatus(item({ capacity: 40 }), early, 10).label).toBe('Open · 30 of 40 seats left');
    expect(liveStatus(item({ capacity: 40 }), early, 35).label).toBe('Filling up · 5 seats left');
  });

  it('adds walk-ins only from 45 minutes before the start, up to 20 to 70 percent', () => {
    const target = item({ capacity: 100 });
    expect(liveStatus(target, at(9, 15), 0).taken).toBe(0);
    const halfway = liveStatus(target, at(9, 40), 0).taken;
    const atStart = liveStatus(target, at(10, 0), 0).taken;
    expect(atStart).toBeGreaterThanOrEqual(20);
    expect(atStart).toBeLessThanOrEqual(70);
    expect(halfway).toBeLessThanOrEqual(atStart);
    expect(liveStatus(target, at(10, 0), 90).taken).toBe(100);
  });
});
