import { describe, expect, it } from '@jest/globals';

import {
  eventTimeLabel,
  formatDateTime,
  formatDuration,
  formatFullDay,
  formatCents,
  formatShortDay,
  formatTime,
  fullName,
  minutesToTime,
  relativeAge,
  toMinutes,
} from '@/lib/format';
import { wallTimeMs } from '@/lib/event-clock';

describe('format helpers', () => {
  it('formats date and 12h time', () => {
    expect(formatDateTime('2026-05-29T22:02:00', false)).toBe('29.5.2026 at 10:02 PM');
    expect(formatDateTime('2026-05-28T00:05:00', false)).toBe('28.5.2026 at 12:05 AM');
    expect(formatDateTime('2026-05-28T12:00:00', false)).toBe('28.5.2026 at 12:00 PM');
  });

  it('gives a short relative age', () => {
    const now = new Date('2026-11-19T10:00:00');
    expect(relativeAge('2026-11-19T09:55:00', now)).toBe('5m');
    expect(relativeAge('2026-11-19T07:00:00', now)).toBe('3h');
    expect(relativeAge('2026-11-16T10:00:00', now)).toBe('3d');
    expect(relativeAge('2026-05-27T08:00:00', now)).toBe('5mo');
    expect(relativeAge('2024-11-01T08:00:00', now)).toBe('2y');
  });

  it('formats date and 24h time', () => {
    expect(formatDateTime('2026-05-29T22:02:00', true)).toBe('29.5.2026 at 22:02');
    expect(formatDateTime('2026-05-28T00:05:00', true)).toBe('28.5.2026 at 00:05');
  });
});

describe('formatTime', () => {
  it('formats 12h without a leading zero', () => {
    expect(formatTime('09:50', false)).toBe('9:50 AM');
    expect(formatTime('13:30', false)).toBe('1:30 PM');
    expect(formatTime('00:00', false)).toBe('12:00 AM');
  });

  it('formats 24h with a leading zero', () => {
    expect(formatTime('13:30', true)).toBe('13:30');
    expect(formatTime('09:00', true)).toBe('09:00');
    expect(formatTime(new Date(2026, 4, 28, 9, 5), true)).toBe('09:05');
  });
});

describe('day and clock helpers', () => {
  it('converts between "HH:MM" and minutes', () => {
    expect(toMinutes('13:05')).toBe(785);
    expect(minutesToTime(785)).toBe('13:05');
    expect(minutesToTime(600)).toBe('10:00');
  });

  it('formats full and short day labels in local time', () => {
    expect(formatFullDay('2026-05-28')).toBe('Thursday, May 28');
    expect(formatShortDay('2026-05-28')).toBe('Thu, May 28');
  });
});

describe('fullName', () => {
  it('joins the names and falls back to Attendee', () => {
    expect(fullName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    expect(fullName({ firstName: 'Ada', lastName: '' })).toBe('Ada');
    expect(fullName({ firstName: '', lastName: '' })).toBe('Attendee');
  });
});

describe('formatDuration', () => {
  it('shows minutes under an hour, then hours and minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(1)).toBe('1 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(318)).toBe('5 h 18 min');
    expect(formatDuration(540)).toBe('9 h');
    expect(formatDuration(-3)).toBe('0 min');
  });
});

describe('eventTimeLabel', () => {
  it('formats event wall time even when the instant is on the previous UTC day', () => {
    expect(eventTimeLabel(new Date(wallTimeMs('2026-05-28T00:05')), false)).toBe('Thu, May 28, 12:05 AM');
    expect(eventTimeLabel(new Date(wallTimeMs('2026-05-28T10:05')), true)).toBe('Thu, May 28, 10:05');
  });
});

describe('formatCents', () => {
  it('shows whole euros without decimals and cents with two', () => {
    expect(formatCents(4500)).toBe('€45');
    expect(formatCents(12000)).toBe('€120');
    expect(formatCents(2550)).toBe('€25.50');
  });
});
