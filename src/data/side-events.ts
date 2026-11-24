import { sideEvents } from '@/data/side-events-seed';
import type { SideEvent, SideEventCategory } from '@/data/types';

export { sideEvents };

export type SideEventFilter = {
  day?: string;
  category?: SideEventCategory;
  query?: string;
};

export function listSideEvents(filter?: SideEventFilter): SideEvent[] {
  let result = sideEvents;
  if (filter?.day) result = result.filter((s) => s.day === filter.day);
  if (filter?.category) result = result.filter((s) => s.category === filter.category);
  if (filter?.query) {
    const q = filter.query.toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.venueName.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q),
    );
  }
  return result;
}

export function getSideEvent(id: string): SideEvent | undefined {
  return sideEvents.find((s) => s.id === id);
}

export function listSideEventCategories(): SideEventCategory[] {
  return [...new Set(sideEvents.map((s) => s.category))];
}
