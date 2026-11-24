import { describe, expect, it } from '@jest/globals';

import seed from '@/backend/seed-db.json';
import {
  getSideEvent,
  listChallenges,
  listPlaces,
  listSessions,
  listSideEventCategories,
  listSideEvents,
  listSponsors,
  listStampTargets,
} from '@/data';
import { itemEndMs, itemStartMs, sessionToItem, sideEventToItem } from '@/lib/agenda-item';
import { wallTimeMs } from '@/lib/event-clock';
import { haversineMetres, VENUE_CENTER } from '@/lib/geo';

describe('side events', () => {
  const events = listSideEvents();

  it('seeds 14 events over the three days, 9 with a capacity of 30 to 150', () => {
    expect(events).toHaveLength(14);
    expect(new Set(events.map((e) => e.day))).toEqual(
      new Set(['2026-05-27', '2026-05-28', '2026-05-29']),
    );
    const withCapacity = events.filter((e) => e.capacity !== undefined);
    expect(withCapacity).toHaveLength(9);
    for (const e of withCapacity) {
      expect(e.capacity).toBeGreaterThanOrEqual(30);
      expect(e.capacity).toBeLessThanOrEqual(150);
    }
  });

  it('places every event within 7 km of the main venue (inside the city)', () => {
    for (const e of events) {
      expect(haversineMetres(VENUE_CENTER, [e.lng, e.lat])).toBeLessThanOrEqual(7000);
    }
  });

  it('has events running at the Day 2 10:05 and 14:25 presets', () => {
    const running = (wall: string) =>
      events
        .map(sideEventToItem)
        .filter(
          (item) => itemStartMs(item) <= wallTimeMs(wall) && wallTimeMs(wall) < itemEndMs(item),
        ).length;
    expect(running('2026-05-28T10:05') + running('2026-05-28T14:25')).toBeGreaterThanOrEqual(3);
  });

  it('filters by day, category and query', () => {
    expect(listSideEvents({ day: '2026-05-29' }).every((e) => e.day === '2026-05-29')).toBe(true);
    expect(listSideEvents({ category: 'Party' }).every((e) => e.category === 'Party')).toBe(true);
    expect(listSideEvents({ query: 'robotics' }).map((e) => e.id)).toContain('se-robotics-demo');
    expect(getSideEvent('se-robotics-demo')?.title).toBe('Robotics Showcase');
    expect(listSideEventCategories().sort()).toEqual([
      'Exhibition',
      'Meetup',
      'Party',
      'Talk',
      'Workshop',
    ]);
  });
});

describe('session capacity', () => {
  it('six sessions have 20 to 60 seats', () => {
    const withCapacity = listSessions().filter((s) => s.capacity !== undefined);
    expect(withCapacity).toHaveLength(6);
    for (const s of withCapacity) {
      expect(sessionToItem(s).capacity).toBe(s.capacity);
      expect(s.capacity).toBeGreaterThanOrEqual(20);
      expect(s.capacity).toBeLessThanOrEqual(60);
    }
  });
});

describe('seeded reservations and stamps', () => {
  const capacity = new Map<string, number>();
  for (const s of listSessions())
    if (s.capacity !== undefined) capacity.set(sessionToItem(s).key, s.capacity);
  for (const e of listSideEvents())
    if (e.capacity !== undefined) capacity.set(sideEventToItem(e).key, e.capacity);

  it('a third of the capacity items start nearly full and two start full', () => {
    const reserved: Record<string, number> = seed.shared.reserved;
    for (const key of Object.keys(reserved)) expect(capacity.has(key)).toBe(true);
    const full = [...capacity].filter(([key, cap]) => (reserved[key] ?? 0) === cap);
    const nearly = [...capacity].filter(([key, cap]) => {
      const left = cap - (reserved[key] ?? 0);
      return left > 0 && left <= 3;
    });
    expect(full).toHaveLength(2);
    expect(nearly).toHaveLength(Math.round(capacity.size / 3));
  });

  it('stamp targets cover every place, sponsor and side event, and seeded stamps exist', () => {
    const targets = listStampTargets();
    const sponsorCount = listSponsors().flatMap((tier) => tier.sponsors).length;
    expect(targets).toHaveLength(listPlaces().length + sponsorCount + listSideEvents().length);
    expect(listChallenges()).toHaveLength(6);
    const ids = new Set(targets.map((t) => t.id));
    expect(seed.states['acct-media'].stamps).toHaveLength(4);
    expect(seed.states['acct-investor'].stamps).toHaveLength(2);
    for (const state of Object.values(seed.states)) {
      for (const stamp of 'stamps' in state ? state.stamps : [])
        expect(ids.has(stamp.targetId)).toBe(true);
    }
  });
});
