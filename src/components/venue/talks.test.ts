import { describe, expect, it } from '@jest/globals';

import { placeStageId, talksAt } from '@/components/venue/talks';
import { getEvent, listPlaces } from '@/data';

const place = (id: string) => listPlaces().find((p) => p.id === id)!;

describe('venue talks', () => {
  it('maps a stage place to its stage and a lounge to none', () => {
    expect(placeStageId(place('place-hudson'))).toBe('stage-hudson');
    expect(placeStageId(place('place-networking'))).toBeNull();
  });

  it('returns only that hall\'s sessions for the day, in start order', () => {
    const peristylion = place('place-hudson');
    const day = getEvent().days.find((d) => talksAt(peristylion, d).length > 0);
    expect(day).toBeDefined();
    const talks = talksAt(peristylion, day!);
    expect(talks.every((s) => s.stageId === 'stage-hudson' && s.dayId === day)).toBe(true);
    const times = talks.map((s) => s.startTime);
    expect(times).toEqual([...times].sort((a, b) => a.localeCompare(b)));
  });

  it('returns nothing for a place that hosts no talks', () => {
    expect(talksAt(place('place-networking'), getEvent().days[0])).toEqual([]);
  });
});
