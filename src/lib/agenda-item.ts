import type { Href } from 'expo-router';

import type { Meeting, StoreState } from '@/backend/types';
import { isAllDay } from '@/components/schedule/agenda-math';
import { getSession, listStages } from '@/data';
import type { Session, SideEvent } from '@/data/types';
import type { FeatureFlags } from '@/lib/features';
import { eventWallClock, wallTimeMs } from '@/lib/event-clock';
import { minutesToTime, toMinutes } from '@/lib/format';
import { addIn } from '@/lib/utils';

/** One schedulable thing, normalized across sessions, side events and meetings. */
export type AgendaItem = {
  key: string;
  kind: 'session' | 'side-event' | 'meeting';
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  place: string;
  lat?: number;
  lng?: number;
  capacity?: number;
};

export function agendaKey(kind: AgendaItem['kind'], id: string): string {
  return `${kind}:${id}`;
}

/** The item's start as an instant (epoch ms), read in the event's timezone. */
export function itemStartMs(item: AgendaItem): number {
  return wallTimeMs(`${item.day}T${item.startTime}`);
}

/** The item's end as an instant (epoch ms), read in the event's timezone. */
export function itemEndMs(item: AgendaItem): number {
  return wallTimeMs(`${item.day}T${item.endTime}`);
}

/** Where an item opens: its detail screen, or My Schedule for a meeting. */
export function itemHref(item: AgendaItem): Href {
  if (item.kind === 'meeting') return '/my-schedule';
  if (item.kind === 'session') return { pathname: '/session/[id]', params: { id: item.id } };
  return { pathname: '/side-event/[id]', params: { id: item.id } };
}

/** Earliest start first; same start by title. */
export function byStart(a: AgendaItem, b: AgendaItem): number {
  return itemStartMs(a) - itemStartMs(b) || a.title.localeCompare(b.title);
}

export function sessionToItem(session: Session): AgendaItem {
  return {
    key: agendaKey('session', session.id),
    kind: 'session',
    id: session.id,
    title: session.title,
    day: session.dayId,
    startTime: session.startTime,
    endTime: session.endTime,
    place: listStages().find((stage) => stage.id === session.stageId)?.name ?? '',
    ...(session.capacity !== undefined ? { capacity: session.capacity } : {}),
  };
}

export function sideEventToItem(sideEvent: SideEvent): AgendaItem {
  return {
    key: agendaKey('side-event', sideEvent.id),
    kind: 'side-event',
    id: sideEvent.id,
    title: sideEvent.title,
    day: sideEvent.day,
    startTime: sideEvent.startTime,
    endTime: sideEvent.endTime,
    place: sideEvent.venueName,
    lat: sideEvent.lat,
    lng: sideEvent.lng,
    ...(sideEvent.capacity !== undefined ? { capacity: sideEvent.capacity } : {}),
  };
}

export function meetingToItem(meeting: Meeting): AgendaItem {
  const startMinutes = toMinutes(meeting.start.slice(11, 16));
  return {
    key: agendaKey('meeting', meeting.id),
    kind: 'meeting',
    id: meeting.id,
    title: meeting.name,
    day: meeting.start.slice(0, 10),
    startTime: meeting.start.slice(11, 16),
    endTime: minutesToTime(startMinutes + meeting.duration),
    place: meeting.place,
  };
}

/** Tomorrow's date on the event calendar, "YYYY-MM-DD". */
export function eventTomorrow(now: Date): string {
  return eventWallClock(new Date(now.getTime() + 86400000)).day;
}

/**
 * All-day placeholder blocks ("Side Events Thursday") are not things to walk to now or next.
 * Sessions use the agenda's own rule; other items count as all-day past the same six hours.
 */
export function isAllDayItem(item: AgendaItem): boolean {
  const session = item.kind === 'session' ? getSession(item.id) : undefined;
  return session ? isAllDay(session) : toMinutes(item.endTime) - toMinutes(item.startTime) > 6 * 60;
}

/** Lists of what is on now or next skip all-day blocks; the pure helpers that rank them keep their contract. */
export function withoutAllDay<T extends AgendaItem>(items: T[]): T[] {
  return items.filter((item) => !isAllDayItem(item));
}

const KIND_FEATURE = { meeting: 'meetings', session: 'schedule', 'side-event': 'sideEvents' } as const;

/** Items whose feature switch is off leave the displayed agenda; stored selections are untouched, so switching back restores them. */
export function withoutDisabledFeatures<T extends AgendaItem>(
  items: T[],
  flags: Pick<FeatureFlags, 'meetings' | 'schedule' | 'sideEvents'>,
): T[] {
  return items.filter((item) => flags[KIND_FEATURE[item.kind]]);
}

/** The item saved to the agenda with its reminder on: what a reserved seat or an approved request adds. */
export function withAgendaEntry(s: StoreState, item: AgendaItem): StoreState {
  return {
    ...s,
    bookmarks: {
      ...s.bookmarks,
      mySessions: item.kind === 'session' ? addIn(s.bookmarks.mySessions, item.id) : s.bookmarks.mySessions,
    },
    mySideEvents: item.kind === 'side-event' ? addIn(s.mySideEvents, item.id) : s.mySideEvents,
    reminders: addIn(s.reminders, item.key),
  };
}
