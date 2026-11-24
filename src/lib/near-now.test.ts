import { describe, expect, it } from '@jest/globals';

import { agendaKey, type AgendaItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { VENUE_CENTER } from '@/lib/geo';
import { nearNow } from '@/lib/near-now';

function session(id: string, startTime: string, endTime: string): AgendaItem {
  return {
    key: agendaKey('session', id),
    kind: 'session',
    id,
    title: id,
    day: '2026-05-28',
    startTime,
    endTime,
    place: 'Stage',
  };
}

function sideEvent(
  id: string,
  startTime: string,
  endTime: string,
  lat: number,
  lng: number,
  capacity?: number,
): AgendaItem {
  return {
    key: agendaKey('side-event', id),
    kind: 'side-event',
    id,
    title: id,
    day: '2026-05-28',
    startTime,
    endTime,
    place: 'Venue',
    lat,
    lng,
    ...(capacity === undefined ? {} : { capacity }),
  };
}

const now = new Date(wallTimeMs('2026-05-28T10:00'));
const atVenue = { lat: VENUE_CENTER[1], lng: VENUE_CENTER[0] };

describe('nearNow', () => {
  it('includes live items and those starting within the window, not ended or far future', () => {
    const sessions = [
      session('s1', '09:45', '10:15'),
      session('s2', '10:20', '10:40'),
      session('s3', '08:00', '08:30'),
      session('s4', '12:00', '12:30'),
    ];
    const result = nearNow({ sessions, sideEvents: [], now, origin: null, reservedCounts: {} });
    expect(result.map((r) => r.item.id)).toEqual(['s1', 's2']);
  });

  it('places sessions at the venue centre', () => {
    const result = nearNow({
      sessions: [session('s1', '09:45', '10:15')],
      sideEvents: [],
      now,
      origin: atVenue,
      reservedCounts: {},
    });
    expect(result[0].metres).toBe(0);
  });

  it('computes walk minutes rounded at 1.3 m/s, at least 1', () => {
    const north = sideEvent('se1', '09:45', '10:15', VENUE_CENTER[1] + 0.001, VENUE_CENTER[0]);
    const result = nearNow({
      sessions: [],
      sideEvents: [north],
      now,
      origin: atVenue,
      reservedCounts: {},
    });
    expect(result[0].metres).toBeGreaterThan(0);
    expect(result[0].walkMinutes).toBe(Math.max(1, Math.round((result[0].metres ?? 0) / (1.3 * 60))));
  });

  it('sorts full items last', () => {
    const full = sideEvent('se1', '09:45', '10:15', VENUE_CENTER[1], VENUE_CENTER[0], 1);
    const open = sideEvent('se2', '09:50', '10:20', VENUE_CENTER[1], VENUE_CENTER[0], 10);
    const result = nearNow({
      sessions: [],
      sideEvents: [open, full],
      now,
      origin: atVenue,
      reservedCounts: { [agendaKey('side-event', 'se1')]: 1 },
    });
    expect(result.at(-1)?.item.id).toBe('se1');
  });

  it('sorts by distance then start with an origin, and by start without one', () => {
    const near = sideEvent('near', '10:10', '11:00', VENUE_CENTER[1] + 0.001, VENUE_CENTER[0]);
    const far = sideEvent('far', '09:50', '11:00', VENUE_CENTER[1] + 0.01, VENUE_CENTER[0]);
    const withOrigin = nearNow({
      sessions: [],
      sideEvents: [far, near],
      now,
      origin: atVenue,
      reservedCounts: {},
    });
    expect(withOrigin.map((r) => r.item.id)).toEqual(['near', 'far']);
    const noOrigin = nearNow({
      sessions: [],
      sideEvents: [near, far],
      now,
      origin: null,
      reservedCounts: {},
    });
    expect(noOrigin.map((r) => r.item.id)).toEqual(['far', 'near']);
    expect(noOrigin[0].metres).toBeNull();
    expect(noOrigin[0].walkMinutes).toBeNull();
  });

  it('leaves out items starting more than 30 minutes from now', () => {
    const later = session('s1', '10:50', '11:20');
    expect(
      nearNow({ sessions: [later], sideEvents: [], now, origin: null, reservedCounts: {} }),
    ).toHaveLength(0);
  });
});
