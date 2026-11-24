import { describe, expect, it } from '@jest/globals';

import { currentMergedIndex, mergeSideEvents } from '@/components/side-events/agenda-merge';
import { applyHubFilters, groupByDay, hasHubFilters, NO_FILTERS, venueWalkMinutes, walkText } from '@/components/side-events/hub-math';
import { groupByTime } from '@/components/schedule/agenda-math';
import { getSideEvent, listSessions, listSideEvents } from '@/data';
import { VENUE_CENTER } from '@/lib/geo';

describe('walking time', () => {
  it('is at least a minute and grows with distance at 1.3 m/s', () => {
    expect(venueWalkMinutes(VENUE_CENTER[1], VENUE_CENTER[0])).toBe(1);
    // 0.01 degrees of latitude is about 1112 m: 1112 / 1.3 / 60 is about 14 minutes.
    expect(venueWalkMinutes(VENUE_CENTER[1] + 0.01, VENUE_CENTER[0])).toBe(14);
    expect(walkText(VENUE_CENTER[1] + 0.01, VENUE_CENTER[0])).toBe('14 min walk from the venue');
  });
});

describe('hub filters', () => {
  it('returns every side event with no filters', () => {
    expect(hasHubFilters(NO_FILTERS)).toBe(false);
    expect(applyHubFilters(NO_FILTERS, () => false)).toHaveLength(listSideEvents().length);
  });

  it('combines day, category and query', () => {
    const day = applyHubFilters({ ...NO_FILTERS, day: '2026-05-28' }, () => false);
    expect(day.length).toBeGreaterThan(0);
    expect(day.every((e) => e.day === '2026-05-28')).toBe(true);
    const workshops = applyHubFilters({ ...NO_FILTERS, category: 'Workshop' }, () => false);
    expect(workshops.every((e) => e.category === 'Workshop')).toBe(true);
    const blank = { ...NO_FILTERS, query: '   ' };
    expect(hasHubFilters(blank)).toBe(false);
    expect(applyHubFilters(blank, () => false)).toHaveLength(listSideEvents().length);
  });

  it('"Has room" drops the full ones only when on', () => {
    const isFull = (e: { id: string }) => e.id === 'se-investor-roundtables';
    expect(applyHubFilters(NO_FILTERS, isFull).some((e) => e.id === 'se-investor-roundtables')).toBe(true);
    const withRoom = applyHubFilters({ ...NO_FILTERS, hasRoom: true }, isFull);
    expect(withRoom.some((e) => e.id === 'se-investor-roundtables')).toBe(false);
    expect(withRoom).toHaveLength(listSideEvents().length - 1);
  });

  it('groups by day in order, each day sorted by start', () => {
    const sections = groupByDay([...listSideEvents()].reverse());
    expect(sections.map((s) => s.title)).toEqual([...new Set(sections.map((s) => s.title))].sort());
    for (const s of sections) {
      const starts = s.data.map((e) => e.startTime);
      expect(starts).toEqual([...starts].sort());
    }
  });
});

describe('mergeSideEvents', () => {
  const day = '2026-05-28';
  const { sections } = groupByTime(listSessions({ day }));
  const events = listSideEvents({ day });

  it('keeps every session and adds every side event, sections in time order', () => {
    const merged = mergeSideEvents(sections, events);
    const rows = merged.flatMap((s) => s.rows);
    expect(rows.filter((r) => r.kind === 'session')).toHaveLength(sections.flatMap((s) => s.sessions).length);
    expect(rows.filter((r) => r.kind === 'side-event')).toHaveLength(events.length);
    const starts = merged.map((s) => s.startTime);
    expect(starts).toEqual([...starts].sort());
  });

  it('puts a side event in the section of its start time', () => {
    const event = getSideEvent('se-robotics-demo');
    if (!event) throw new Error('seed changed');
    const section = mergeSideEvents(sections, [event]).find((s) => s.startTime === event.startTime);
    expect(section?.rows.some((r) => r.kind === 'side-event' && r.event.id === event.id)).toBe(true);
  });

  it('with no side events matches the plain sections', () => {
    expect(mergeSideEvents(sections, []).map((s) => s.startTime)).toEqual(sections.map((s) => s.startTime));
  });

  it('finds the first section that has not ended', () => {
    const merged = mergeSideEvents([], events);
    expect(currentMergedIndex(merged, 0)).toBe(0);
    expect(currentMergedIndex(merged, 24 * 60)).toBe(merged.length);
  });
});
