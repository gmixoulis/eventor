import { formatDay, formatTime } from '@/lib/format';

/** An activity item's body. Meeting items are formatted now, so the 24-hour setting applies;
 * older items stored only a body string and show it as it was written. */
export function activityBody(
  item: { body: string; meetingStart?: string; place?: string },
  use24h: boolean,
  eventName: string,
): string {
  if (!item.meetingStart || !item.place) return item.body;
  const start = new Date(item.meetingStart);
  return `${eventName} ${formatDay(start)}: ${item.place} at ${formatTime(start, use24h)}`;
}

