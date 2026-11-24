import { describe, expect, it, jest } from '@jest/globals';

import { daySections, nowLocation } from '@/components/meetings/day-sections';
import { agendaOverlapLabel } from '@/components/live/overlap';
import { liveActions, reservationTag, reserveState } from '@/components/live/reserve-state';
import { pillTone, pillWord } from '@/components/live/status-pill';
import { agendaKey, itemEndMs, type AgendaItem } from '@/lib/agenda-item';
import type { LiveStatus } from '@/lib/live-status';

// StatusPill's module reaches the store through the theme; the pure helpers under test do not need it.
jest.mock('@/backend/api', () => ({ api: {} }));

const status = (patch: Partial<LiveStatus>): LiveStatus => ({
  phase: 'upcoming',
  level: 'open',
  taken: 5,
  capacity: 40,
  label: 'Open · 35 of 40 seats left',
  ...patch,
});

const item = (kind: AgendaItem['kind'], id: string, day: string, startTime: string, endTime: string): AgendaItem => ({
  key: agendaKey(kind, id),
  kind,
  id,
  title: `Title ${id}`,
  day,
  startTime,
  endTime,
  place: 'Somewhere',
});

describe('reserveState', () => {
  it('hides without a capacity or once ended', () => {
    expect(reserveState(status({ capacity: null, level: 'none' }), null, null)).toEqual({ kind: 'hidden' });
    expect(reserveState(status({ phase: 'ended' }), 'reserved', null)).toEqual({ kind: 'hidden' });
  });
  it('offers a seat when open or filling, the waitlist when full', () => {
    expect(reserveState(status({}), null, null)).toEqual({ kind: 'reserve' });
    expect(reserveState(status({ level: 'filling' }), null, null)).toEqual({ kind: 'reserve' });
    expect(reserveState(status({ level: 'full' }), null, null)).toEqual({ kind: 'join-waitlist' });
  });
  it('shows what the user holds, even while live and full', () => {
    expect(reserveState(status({ level: 'full', phase: 'live' }), 'reserved', null)).toEqual({ kind: 'reserved' });
    expect(reserveState(status({ level: 'full' }), 'waitlist', 3)).toEqual({ kind: 'waitlist', position: 3 });
  });
});

describe('liveActions', () => {
  it('offers the agenda toggle beside reserve only for a saved item with nothing held', () => {
    expect(liveActions(status({}), null, true)).toEqual({ reserve: true, agendaToggle: true, bell: true });
    expect(liveActions(status({}), null, false)).toEqual({ reserve: true, agendaToggle: false, bell: true });
    expect(liveActions(status({}), 'reserved', true)).toEqual({ reserve: true, agendaToggle: false, bell: true });
    expect(liveActions(status({}), 'waitlist', true)).toEqual({ reserve: true, agendaToggle: false, bell: true });
  });
  it('hides reserve and the bell once ended', () => {
    expect(liveActions(status({ phase: 'ended' }), null, false)).toEqual({ reserve: false, agendaToggle: false, bell: false });
    const noCapacity = status({ capacity: null, level: 'none', phase: 'ended' });
    expect(liveActions(noCapacity, null, true)).toEqual({ reserve: false, agendaToggle: true, bell: false });
    expect(liveActions(status({ capacity: null, level: 'none' }), null, false).bell).toBe(true);
  });
});

describe('reservationTag', () => {
  it('names the hold', () => {
    expect(reservationTag('reserved', null)).toBe('Reserved');
    expect(reservationTag('waitlist', 4)).toBe('Waitlist 4');
    expect(reservationTag('waitlist', null)).toBe('Waitlist');
    expect(reservationTag(null, null)).toBeNull();
  });
});

describe('status pill', () => {
  it('maps level and phase to a tone and a word', () => {
    expect([pillTone(status({})), pillWord(status({}))]).toEqual(['success', 'Open']);
    expect([pillTone(status({ level: 'filling' })), pillWord(status({ level: 'filling' }))]).toEqual(['warning', 'Filling']);
    expect([pillTone(status({ level: 'full' })), pillWord(status({ level: 'full' }))]).toEqual(['danger', 'Full']);
    const live = status({ level: 'none', capacity: null, phase: 'live' });
    expect([pillTone(live), pillWord(live)]).toEqual(['accent', 'Live']);
    const soon = status({ level: 'none', capacity: null });
    expect([pillTone(soon), pillWord(soon)]).toEqual(['muted', 'Soon']);
    expect([pillTone(status({ phase: 'ended' })), pillWord(status({ phase: 'ended' }))]).toEqual(['muted', 'Ended']);
  });
});

describe('agendaOverlapLabel', () => {
  const talk = item('side-event', 'a', '2026-05-28', '10:00', '11:00');
  it('names a clashing item, a meeting by its time, and ignores itself and touching ends', () => {
    expect(agendaOverlapLabel(talk, [talk, item('session', 'b', '2026-05-28', '11:00', '12:00')], true)).toBeNull();
    expect(agendaOverlapLabel(talk, [item('session', 'b', '2026-05-28', '10:30', '11:30')], true)).toBe('Overlaps with Title b');
    expect(agendaOverlapLabel(talk, [item('meeting', 'm', '2026-05-28', '10:15', '10:45')], true)).toBe(
      'Overlaps with your 10:15 meeting',
    );
    expect(agendaOverlapLabel(talk, [item('session', 'c', '2026-05-29', '10:00', '11:00')], true)).toBeNull();
  });
});

describe('daySections', () => {
  const early = item('session', 'early', '2026-05-28', '09:00', '10:00');
  const late = item('session', 'late', '2026-05-28', '15:00', '16:00');
  const other = item('side-event', 'other', '2026-05-27', '20:00', '22:00');

  it('groups by day in start order and puts "now" between past and upcoming today', () => {
    const sections = daySections([late, other, early], itemEndMs(early) + 60_000, '2026-05-28');
    expect(sections.map((s) => s.title)).toEqual(['2026-05-27', '2026-05-28']);
    expect(sections[1].data.map((r) => (r.kind === 'now' ? 'now' : r.item.id))).toEqual(['early', 'now', 'late']);
    expect(nowLocation(sections)).toEqual({ sectionIndex: 1, itemIndex: 1 });
  });

  it('adds no "now" row on a day with nothing scheduled, and goes last once all ended', () => {
    expect(nowLocation(daySections([early], 0, '2026-05-29'))).toBeNull();
    const ended = daySections([early, late], itemEndMs(late) + 1, '2026-05-28');
    expect(ended[0].data[ended[0].data.length - 1]).toEqual({ kind: 'now' });
  });
});
