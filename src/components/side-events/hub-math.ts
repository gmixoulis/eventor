import { listSideEvents, type SideEvent, type SideEventCategory } from '@/data';
import { haversineMetres, VENUE_CENTER, walkMinutes } from '@/lib/geo';

export type HubFilters = {
  day: string | null;
  category: SideEventCategory | null;
  hasRoom: boolean;
  query: string;
};

export const NO_FILTERS: HubFilters = { day: null, category: null, hasRoom: false, query: '' };

export function hasHubFilters(f: HubFilters): boolean {
  return f.day !== null || f.category !== null || f.hasRoom || f.query.trim() !== '';
}

/** Whole minutes on foot from the venue centre, at least 1. */
export function venueWalkMinutes(lat: number, lng: number): number {
  return walkMinutes(haversineMetres(VENUE_CENTER, [lng, lat]));
}

export function walkText(lat: number, lng: number): string {
  return `${venueWalkMinutes(lat, lng)} min walk from the venue`;
}

/** The hub's filters over the side events; `isFull` decides "Has room". */
export function applyHubFilters(f: HubFilters, isFull: (event: SideEvent) => boolean): SideEvent[] {
  const query = f.query.trim();
  return listSideEvents({
    ...(f.day ? { day: f.day } : {}),
    ...(f.category ? { category: f.category } : {}),
    ...(query ? { query } : {}),
  }).filter((event) => !f.hasRoom || !isFull(event));
}

/** Sections by day, days in order and events by start time, then title. */
export function groupByDay(events: SideEvent[]): { title: string; data: SideEvent[] }[] {
  const sorted = [...events].sort(
    (a, b) =>
      a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title),
  );
  const sections: { title: string; data: SideEvent[] }[] = [];
  for (const event of sorted) {
    const last = sections[sections.length - 1];
    if (last?.title === event.day) last.data.push(event);
    else sections.push({ title: event.day, data: [event] });
  }
  return sections;
}
