import { byStart, itemEndMs, itemStartMs, type AgendaItem } from '@/lib/agenda-item';
import { haversineMetres, VENUE_CENTER, walkMinutes, type LngLat } from '@/lib/geo';
import { liveStatus, type LiveStatus } from '@/lib/live-status';

const WINDOW_MINUTES = 30;

export type NearNowInput = {
  sessions: AgendaItem[];
  sideEvents: AgendaItem[];
  now: Date;
  origin: { lat: number; lng: number } | null;
  reservedCounts: Record<string, number>;
};

export type NearNowResult = {
  item: AgendaItem;
  metres: number | null;
  walkMinutes: number | null;
  status: LiveStatus;
  startsInMinutes: number;
};

function itemLocation(item: AgendaItem): LngLat {
  return item.lat !== undefined && item.lng !== undefined ? [item.lng, item.lat] : VENUE_CENTER;
}

/**
 * What is live now or starting within 30 minutes. Sessions use the
 * venue centre as their location. With an origin the list is sorted by distance then
 * start; without one, by start. Full items sort last.
 */
export function nearNow(input: NearNowInput): NearNowResult[] {
  const nowMs = input.now.getTime();
  const windowMs = WINDOW_MINUTES * 60000;

  const results: NearNowResult[] = [];
  for (const item of [...input.sessions, ...input.sideEvents]) {
    const started = itemStartMs(item) <= nowMs;
    const live = started && nowMs < itemEndMs(item);
    const upcomingWithin = !started && itemStartMs(item) - nowMs <= windowMs;
    if (!live && !upcomingWithin) continue;

    const metres = input.origin
      ? haversineMetres([input.origin.lng, input.origin.lat], itemLocation(item))
      : null;
    results.push({
      item,
      metres,
      walkMinutes: metres === null ? null : walkMinutes(metres),
      status: liveStatus(item, input.now, input.reservedCounts[item.key] ?? 0),
      startsInMinutes: Math.round((itemStartMs(item) - nowMs) / 60000),
    });
  }

  results.sort((a, b) => {
    const fullA = a.status.level === 'full' ? 1 : 0;
    const fullB = b.status.level === 'full' ? 1 : 0;
    if (fullA !== fullB) return fullA - fullB;
    if (input.origin && a.metres !== null && b.metres !== null && a.metres !== b.metres) {
      return a.metres - b.metres;
    }
    return byStart(a.item, b.item);
  });

  return results;
}
