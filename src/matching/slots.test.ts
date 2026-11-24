import { describe, expect, it } from '@jest/globals';

import { listSlots } from '@/data';
import {
  availableAtHour,
  freeSlots,
  lowestFreeTable,
  meetingOverlaps,
  type SlotMeeting,
  type SlotParty,
} from '@/matching/slots';

const DAY = '2026-05-28';

function meeting(start: string, duration = 15, status = 'pending', table?: number): SlotMeeting {
  return { start, duration, status, table };
}

describe('networkingSlots', () => {
  it('runs 15 minute slots with a 5 minute buffer from 10:00 to 17:00', () => {
    const slots = listSlots(DAY);
    expect(slots).toHaveLength(21);
    expect(slots[0]).toEqual({
      id: `${DAY}T10:00`,
      day: DAY,
      start: '10:00',
      end: '10:15',
    });
    expect(slots[1].start).toBe('10:20');
    expect(slots[slots.length - 1].start).toBe('16:40');
    expect(slots[slots.length - 1].end).toBe('16:55');
  });
});

describe('availableAtHour', () => {
  it('counts no availability as available all day', () => {
    expect(availableAtHour([], listSlots(DAY)[0])).toBe(true);
  });

  it('matches on the hour', () => {
    const slot = listSlots(DAY).find((s) => s.start === '10:20')!;
    expect(availableAtHour([`${DAY}T10:00`], slot)).toBe(true);
    expect(availableAtHour([`${DAY}T11:00`], slot)).toBe(false);
  });
});

describe('meetingOverlaps', () => {
  const slot = listSlots(DAY).find((s) => s.start === '10:00')!;

  it('declined meetings never hold a slot', () => {
    expect(meetingOverlaps(meeting(`${DAY}T10:00`, 15, 'declined'), slot)).toBe(false);
  });

  it('a pending request holds its slot', () => {
    expect(meetingOverlaps(meeting(`${DAY}T10:00`, 15, 'pending'), slot)).toBe(true);
  });

  it('does not overlap a later meeting', () => {
    expect(meetingOverlaps(meeting(`${DAY}T10:30`, 15, 'accepted'), slot)).toBe(false);
  });
});

describe('lowestFreeTable', () => {
  const slot = listSlots(DAY).find((s) => s.start === '13:00')!;

  it('returns table 1 when none are taken', () => {
    expect(lowestFreeTable(slot, [meeting(`${DAY}T14:00`, 15, 'accepted', 1)])).toBe(1);
  });

  it('skips tables taken in that slot', () => {
    const meetings = [meeting(`${DAY}T13:00`, 15, 'accepted', 1), meeting(`${DAY}T13:00`, 15, 'accepted', 2)];
    expect(lowestFreeTable(slot, meetings)).toBe(3);
  });
});

describe('freeSlots', () => {
  const me: SlotParty = {
    availability: [`${DAY}T10:00`, `${DAY}T13:00`],
    meetings: [meeting(`${DAY}T10:00`, 15, 'accepted', 1)],
  };
  const them: SlotParty = { availability: [], meetings: [] };

  it('excludes hours that are unavailable or already booked', () => {
    const slots = freeSlots(DAY, me, them, []);
    expect(slots.some((s) => s.start === '10:00')).toBe(false);
    expect(slots.some((s) => s.start === '10:20')).toBe(true);
    expect(slots.some((s) => s.start === '13:00')).toBe(true);
    expect(slots.some((s) => s.start === '11:00')).toBe(false);
  });

  it('assigns a table to every free slot', () => {
    const slots = freeSlots(DAY, me, them, []);
    expect(slots.every((s) => s.table >= 1)).toBe(true);
  });

  it('gives two accounts booking the same slot different tables', () => {
    const free: SlotParty = { availability: [], meetings: [] };
    const first = freeSlots(DAY, free, free, []).find((s) => s.start === '13:00')!;
    const otherAccount = [meeting(first.id, 15, 'pending', first.table)];
    const second = freeSlots(DAY, free, free, otherAccount).find((s) => s.start === '13:00')!;
    expect(second.table).not.toBe(first.table);
  });

  it('does not offer a slot with all tables taken', () => {
    const free: SlotParty = { availability: [], meetings: [] };
    const full = Array.from({ length: 20 }, (_, i) => meeting(`${DAY}T13:00`, 15, 'accepted', i + 1));
    const slots = freeSlots(DAY, free, free, full);
    expect(slots.some((s) => s.start === '13:00')).toBe(false);
    expect(slots.some((s) => s.start === '13:20')).toBe(true);
  });
});
