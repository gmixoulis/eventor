import { byStart, itemStartMs, type AgendaItem } from '@/lib/agenda-item';

export type Reminder = { item: AgendaItem; minutes: number };

/**
 * Which of the user's reminded items are due now: starting within the next 10 minutes
 * of the event clock, or started less than 5 minutes ago, and not already dismissed.
 * Soonest start first, ties by key, so the banner shows the first one.
 */
export function dueReminders(
  items: AgendaItem[],
  reminders: string[],
  dismissed: string[],
  now: Date,
): Reminder[] {
  const reminderSet = new Set(reminders);
  const dismissedSet = new Set(dismissed);
  const nowMs = now.getTime();

  const due: Reminder[] = [];
  for (const item of items) {
    if (!reminderSet.has(item.key) || dismissedSet.has(item.key)) continue;
    const start = itemStartMs(item);
    const minutes = (start - nowMs) / 60000;
    if (minutes > -5 && minutes <= 10) {
      due.push({ item, minutes: Math.round(minutes) });
    }
  }
  return due.sort((a, b) => byStart(a.item, b.item) || a.item.key.localeCompare(b.item.key));
}
