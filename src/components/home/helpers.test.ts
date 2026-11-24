import { describe, expect, it } from '@jest/globals';

import { isAllDayItem, planUpNext, timeUntil, visibleSections, withoutAllDay } from '@/components/home/helpers';
import { agendaKey, itemHref, type AgendaItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { mergeFeatures } from '@/lib/features';
import { homeSections } from '@/lib/home-layout';

const item: AgendaItem = {
  key: 'session:test', kind: 'session', id: 'test', title: 'Test session',
  day: '2026-05-28', startTime: '10:45', endTime: '11:30', place: 'Stage',
};
const at = (wall: string) => new Date(wallTimeMs(wall));

describe('Home time labels', () => {
  it('rounds up a partial minute and handles the start boundary', () => {
    expect(timeUntil(item, at('2026-05-28T10:05'), false)).toBe('in 40 min');
    expect(timeUntil(item, at('2026-05-28T05:27'), false)).toBe('in 5 h 18 min');
    expect(timeUntil(item, new Date(wallTimeMs('2026-05-28T10:44') + 30000), false)).toBe('in 1 min');
    expect(timeUntil(item, at('2026-05-28T10:45'), false)).toBe('now');
    expect(timeUntil(item, at('2026-05-28T11:00'), false)).toBe('now');
  });
  it('uses the event calendar for tomorrow and respects the time preference', () => {
    expect(timeUntil(item, at('2026-05-27T23:55'), false)).toBe('tomorrow at 10:45 AM');
    expect(timeUntil(item, at('2026-05-27T23:55'), true)).toBe('tomorrow at 10:45');
    expect(timeUntil(item, at('2026-05-26T23:55'), false)).toBe('Thu, May 28 at 10:45 AM');
  });
});

describe('Home visibility', () => {
  it('gives guests the guest order even with a signed-in profile role', () => {
    expect(visibleSections('Investor', true, true)).toEqual([
      'near-now', 'side-events', 'pitches', 'speakers', 'banners', 'word',
    ]);
  });
  it.each(['Startup', 'Investor', 'Corporate', 'Media'])('preserves the %s order for signed-in users', (role) => {
    expect(visibleSections(role, false, true)).toEqual(homeSections(role));
    expect(visibleSections(role, false, false)).toEqual(homeSections(role).filter((section) => section !== 'matches'));
  });
  it('drops the sections of switched-off features and keeps banners and the word', () => {
    const flags = mergeFeatures({ schedule: false, people: false, reels: false, passport: false });
    expect(visibleSections('Startup', false, true, flags)).toEqual(['ticket', 'side-events', 'speakers', 'banners', 'word']);
    expect(visibleSections('Investor', true, true, mergeFeatures({ sideEvents: false, speakers: false }))).toEqual([
      'near-now', 'pitches', 'banners', 'word',
    ]);
  });
  it('shows the ticket section only to signed-in users with tickets enabled', () => {
    expect(visibleSections('Startup', false, true)).toContain('ticket');
    expect(visibleSections('Startup', true, true)).not.toContain('ticket');
    expect(visibleSections('Startup', false, true, mergeFeatures({ tickets: false }))).not.toContain('ticket');
  });
});

describe('agenda destinations', () => {
  it('opens the right detail or the meeting agenda', () => {
    expect(itemHref(item)).toEqual({ pathname: '/session/[id]', params: { id: 'test' } });
    expect(itemHref({ ...item, kind: 'side-event' })).toEqual({ pathname: '/side-event/[id]', params: { id: 'test' } });
    expect(itemHref({ ...item, kind: 'meeting' })).toBe('/my-schedule');
  });
});

describe('all-day blocks on Home', () => {
  const placeholder: AgendaItem = { ...item, key: 'session:side-day-two', id: 'side-day-two', title: 'Side Events Thursday', startTime: '09:00', endTime: '23:00' };
  it('recognizes the flagged placeholder session and long non-session items', () => {
    expect(isAllDayItem(placeholder)).toBe(true);
    expect(isAllDayItem(item)).toBe(false);
    expect(isAllDayItem({ ...item, kind: 'side-event', startTime: '08:00', endTime: '20:00' })).toBe(true);
    expect(isAllDayItem({ ...item, kind: 'side-event', startTime: '18:00', endTime: '22:00' })).toBe(false);
  });
  it('drops only the all-day items and keeps order', () => {
    const other = { ...item, key: 'session:b', id: 'b' };
    expect(withoutAllDay([item, placeholder, other])).toEqual([item, other]);
  });
});

describe('Up Next section plan', () => {
  const now = at('2026-05-28T10:00');
  const timed = (id: string, startTime: string, endTime: string, kind: AgendaItem['kind'] = 'session'): AgendaItem => ({
    key: agendaKey(kind, id), kind, id, title: id, day: '2026-05-28', startTime, endTime, place: 'Stage',
  });

  it('shows the item in progress as now and lists up to three items after it', () => {
    const plan = planUpNext([
      timed('now', '09:45', '10:15'),
      timed('n1', '11:00', '11:30'),
      timed('n2', '12:00', '12:30'),
      timed('n3', '13:00', '13:30'),
    ], now);
    expect(plan.now?.id).toBe('now');
    expect(plan.next?.id).toBe('n1');
    expect(plan.following.map((entry) => entry.id)).toEqual(['n1', 'n2', 'n3']);
  });

  it('leads with the next item and lists the two after it when nothing is in progress', () => {
    const plan = planUpNext([
      timed('n1', '11:00', '11:30'),
      timed('n2', '12:00', '12:30'),
      timed('n3', '13:00', '13:30'),
    ], now);
    expect(plan.now).toBeNull();
    expect(plan.next?.id).toBe('n1');
    expect(plan.following.map((entry) => entry.id)).toEqual(['n2', 'n3']);
  });

  it('returns nothing at all for an empty agenda', () => {
    expect(planUpNext([], now)).toEqual({ now: null, next: null, following: [] });
  });

  it('caps the following list at three when more are upcoming', () => {
    const plan = planUpNext([
      timed('now', '09:45', '10:15'),
      timed('n1', '11:00', '11:30'),
      timed('n2', '12:00', '12:30'),
      timed('n3', '13:00', '13:30'),
      timed('n4', '14:00', '14:30'),
      timed('n5', '15:00', '15:30'),
    ], now);
    expect(plan.following.map((entry) => entry.id)).toEqual(['n1', 'n2', 'n3']);
  });

  it('excludes all-day items from the plan', () => {
    const plan = planUpNext([
      timed('all-day', '08:00', '20:00', 'side-event'),
      timed('n1', '11:00', '11:30'),
    ], now);
    expect(plan.now).toBeNull();
    expect(plan.next?.id).toBe('n1');
    expect(plan.following.map((entry) => entry.id)).toEqual([]);
  });
});
