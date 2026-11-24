import type { NetworkingSlot } from '@/data/types';
import { minutesToTime } from '@/lib/format';

export const NETWORKING_AREA = 'Networking Area';
export const NETWORKING_TABLE_COUNT = 20;
const SLOT_LENGTH = 15;
const SLOT_BUFFER = 5;
const START_MINUTES = 10 * 60;
const END_MINUTES = 17 * 60;

/**
 * Every networking slot for one day: 15 minutes long with a 5 minute buffer,
 * from 10:00 to 17:00, in the Networking Area.
 */
export function networkingSlots(day: string): NetworkingSlot[] {
  const slots: NetworkingSlot[] = [];
  for (let m = START_MINUTES; m + SLOT_LENGTH <= END_MINUTES; m += SLOT_LENGTH + SLOT_BUFFER) {
    slots.push({
      id: `${day}T${minutesToTime(m)}`,
      day,
      start: minutesToTime(m),
      end: minutesToTime(m + SLOT_LENGTH),
    });
  }
  return slots;
}

export function slotPlace(table: number): string {
  return `Table ${table}, ${NETWORKING_AREA}`;
}
