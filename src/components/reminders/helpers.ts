import { formatDuration } from '@/lib/format';
import type { Reminder } from '@/lib/reminders';

/** The banner line; a waitlisted item says so, since the user holds no seat yet. */
export function reminderText({ item, minutes }: Reminder, waitlisted = false): string {
  const when = minutes <= 0 ? `${item.title} has started` : `${item.title} starts in ${formatDuration(minutes)}`;
  return waitlisted ? `${when}. You are on the waitlist` : when;
}

export function hidesReminders(pathname: string): boolean {
  return pathname === '/reels' || pathname.startsWith('/reels/') || pathname === '/announcements';
}
