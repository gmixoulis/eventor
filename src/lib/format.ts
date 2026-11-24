// Date, time and name formatting shared by every feature. Times honor the user's 24-hour setting.

import { eventWallClock } from '@/lib/event-clock';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "HH:MM" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight -> "HH:MM". */
export function minutesToTime(total: number): string {
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** "13:05" or a Date -> "1:05 PM" (12h) or "13:05" (24h). */
export function formatTime(time: string | Date, use24h: boolean): string {
  const [h, m] =
    typeof time === 'string' ? time.split(':').map(Number) : [time.getHours(), time.getMinutes()];
  if (use24h) return `${pad2(h)}:${pad2(m)}`;
  return `${h % 12 || 12}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "29.5.2026" */
export function formatDay(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

/** "29.5.2026 at 10:02 PM" */
export function formatDateTime(iso: string, use24h: boolean): string {
  const date = new Date(iso);
  return `${formatDay(date)} at ${formatTime(date, use24h)}`;
}

/** "2026-05-28" -> { weekday, short, month, day }. Local time, no UTC shift. */
export function parseDay(date: string): {
  weekday: string;
  short: string;
  month: string;
  day: number;
} {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return { weekday, short: weekday.slice(0, 3), month: MONTHS[m - 1], day: d };
}

/** "2026-05-28" -> "Thursday, May 28". */
export function formatFullDay(date: string): string {
  const { weekday, month, day } = parseDay(date);
  return `${weekday}, ${month} ${day}`;
}

/** "2026-05-28" -> "Thu, May 28". */
export function formatShortDay(date: string): string {
  const { short, month, day } = parseDay(date);
  return `${short}, ${month.slice(0, 3)} ${day}`;
}

/** The event wall clock at an instant: "Thu, May 28, 10:05 AM". */
export function eventTimeLabel(now: Date, use24h: boolean): string {
  const wall = eventWallClock(now);
  return `${formatShortDay(wall.day)}, ${formatTime(wall.time, use24h)}`;
}

/** A countdown or length in whole minutes: "45 min", "1 h", "5 h 18 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Short age such as "5mo", "3d", "2h". */
export function relativeAge(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

/** "Ada Lovelace", or "Attendee" while both names are empty. */
export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim() || 'Attendee';
}

/** Euro price in cents: "€45" for whole euros, "€45.50" otherwise. */
export function formatCents(cents: number): string {
  const euros = cents / 100;
  return `€${cents % 100 === 0 ? euros.toFixed(0) : euros.toFixed(2)}`;
}
