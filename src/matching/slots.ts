import { NETWORKING_TABLE_COUNT, listSlots } from '@/data';
import type { NetworkingSlot } from '@/data/types';

export type SlotMeeting = {
  start: string;
  duration: number;
  status: string;
  table?: number;
};

export type SlotParty = {
  availability: string[];
  meetings: SlotMeeting[];
};

export type FreeSlot = NetworkingSlot & { table: number };

const SLOT_LENGTH_MINUTES = 15;

function hourOf(datetime: string): string {
  return datetime.slice(0, 13);
}

/** A person with no availability counts as available all day; otherwise the hour must match. */
export function availableAtHour(availability: string[], slot: NetworkingSlot): boolean {
  if (availability.length === 0) return true;
  const hour = hourOf(slot.id);
  return availability.some((entry) => hourOf(entry) === hour);
}

/** Declined meetings never hold a slot; pending requests do. */
export function meetingOverlaps(meeting: SlotMeeting, slot: NetworkingSlot): boolean {
  if (meeting.status === 'declined') return false;
  const slotStart = Date.parse(`${slot.id}Z`);
  const slotEnd = slotStart + SLOT_LENGTH_MINUTES * 60_000;
  const meetingStart = Date.parse(`${meeting.start}Z`);
  const meetingEnd = meetingStart + meeting.duration * 60_000;
  return meetingStart < slotEnd && meetingEnd > slotStart;
}

/** Lowest numbered table not already taken in this slot across the known meetings. */
export function lowestFreeTable(slot: NetworkingSlot, meetings: SlotMeeting[]): number | undefined {
  const used = new Set<number>();
  for (const meeting of meetings) {
    if (meeting.table !== undefined && meetingOverlaps(meeting, slot)) used.add(meeting.table);
  }
  for (let table = 1; table <= NETWORKING_TABLE_COUNT; table++) {
    if (!used.has(table)) return table;
  }
  return undefined;
}

/**
 * Slots both people have free, with an automatic table assignment for each. `occupied` holds
 * every other known meeting (all demo accounts), so a table is never handed out twice.
 */
export function freeSlots(
  day: string,
  me: SlotParty,
  them: SlotParty,
  occupied: SlotMeeting[],
): FreeSlot[] {
  const tableHolders = [...occupied, ...me.meetings, ...them.meetings];
  const out: FreeSlot[] = [];
  for (const slot of listSlots(day)) {
    if (!availableAtHour(me.availability, slot)) continue;
    if (!availableAtHour(them.availability, slot)) continue;
    if (me.meetings.some((meeting) => meetingOverlaps(meeting, slot))) continue;
    if (them.meetings.some((meeting) => meetingOverlaps(meeting, slot))) continue;
    const table = lowestFreeTable(slot, tableHolders);
    if (table === undefined) continue;
    out.push({ ...slot, table });
  }
  return out;
}
