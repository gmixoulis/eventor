import { describe, expect, it } from '@jest/globals';

import {
  getGoal,
  getInterest,
  listGoals,
  listInterests,
  listPeople,
  listSessions,
  listSlots,
  listSpeakers,
  listSponsors,
  search,
} from '@/data';

describe('listSessions', () => {
  it('filters by day', () => {
    const result = listSessions({ day: '2026-05-27' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.dayId === '2026-05-27')).toBe(true);
  });

  it('filters by track', () => {
    const result = listSessions({ trackIds: ['track-ai'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.trackId === 'track-ai')).toBe(true);
  });

  it('filters by speaker', () => {
    const result = listSessions({ speakerIds: ['sp-019'] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.speakerIds.includes('sp-019'))).toBe(true);
  });

  it('filters by query', () => {
    const result = listSessions({ query: 'mobility' });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((s) =>
        `${s.title} ${s.description}`.toLowerCase().includes('mobility'),
      ),
    ).toBe(true);
  });

  it('combines filters', () => {
    const result = listSessions({
      day: '2026-05-27',
      trackIds: ['track-ai'],
      speakerIds: ['sp-006'],
      query: 'bleeding-edge',
    });
    expect(result.map((s) => s.id)).toEqual(['s-lab-to-product']);
  });
});

describe('listSpeakers', () => {
  it('returns all 137 speakers', () => {
    expect(listSpeakers()).toHaveLength(137);
  });

  it('every speaker photo, when present, is https', () => {
    expect(listSpeakers().every((s) => !s.photo || s.photo.startsWith('https'))).toBe(true);
  });

  it('finds Tomas Kowalczyk for "voxwell"', () => {
    expect(listSpeakers({ query: 'voxwell' }).map((s) => s.name)).toContain('Tomas Kowalczyk');
  });

  it('sorts by name alphabetically', () => {
    const names = listSpeakers({ sort: 'name' }).map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('sponsors', () => {
  it('lists the demo sponsors by name across tiers (the demo data ships no logos)', () => {
    const names = listSponsors().flatMap((t) => t.sponsors).map((s) => s.name);
    for (const name of ['Skyline Air', 'Empire State Bank', 'Arcade Works', 'Metro Power', 'Deep Capital Group', 'Hudson Cloud']) {
      expect(names).toContain(name);
    }
  });
});

describe('matchmaking data', () => {
  it('lists nine goals with symmetric pairing', () => {
    const goals = listGoals();
    expect(goals).toHaveLength(9);
    for (const goal of goals) {
      const partner = goals.find((g) => g.id === goal.pairsWith);
      expect(partner).toBeDefined();
      expect(partner!.pairsWith).toBe(goal.id);
    }
  });

  it('lists 36 interests with unique ids and distinct ids for duplicate names', () => {
    const interests = listInterests();
    expect(interests).toHaveLength(36);
    const ids = interests.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const seriesA = interests.filter((i) => i.name === 'Series A');
    expect(seriesA).toHaveLength(2);
    expect(seriesA[0].id).not.toBe(seriesA[1].id);
  });

  it('filters people by interest and by goal', () => {
    const byInterest = listPeople(undefined, { interestIds: ['group-industry-fintech'] });
    expect(byInterest.length).toBeGreaterThan(0);
    expect(
      byInterest.every((p) => p.selections.some((s) => s.interestId === 'group-industry-fintech')),
    ).toBe(true);

    const byGoal = listPeople(undefined, { goalIds: ['invest'] });
    expect(byGoal.length).toBeGreaterThan(0);
    expect(byGoal.every((p) => p.selections.some((s) => s.goalId === 'invest'))).toBe(true);
  });

  it('gives every sample person valid selections', () => {
    for (const person of listPeople()) {
      expect(person.selections.length).toBeGreaterThanOrEqual(3);
      const interestIds = person.selections.map((s) => s.interestId);
      expect(new Set(interestIds).size).toBe(interestIds.length);
      for (const selection of person.selections) {
        const interest = getInterest(selection.interestId);
        const goal = getGoal(selection.goalId);
        expect(interest).toBeDefined();
        expect(goal).toBeDefined();
        expect(interest!.intents).toContain(goal!.intentId);
      }
    }
  });
});

describe('search', () => {
  it('returns empty arrays for an empty query', () => {
    expect(search('')).toEqual({ people: [], sessions: [], speakers: [], sponsors: [] });
    expect(search('   ')).toEqual({ people: [], sessions: [], speakers: [], sponsors: [] });
  });

  it('returns people matches', () => {
    expect(search('New York Ledger').people.length).toBeGreaterThan(0);
  });

  it('returns session matches', () => {
    expect(search('mobility').sessions.length).toBeGreaterThan(0);
  });

  it('returns speaker matches', () => {
    expect(search('voxwell').speakers.length).toBeGreaterThan(0);
  });

  it('returns sponsor matches', () => {
    expect(search('skyline').sponsors.length).toBeGreaterThan(0);
  });
});

describe('networking slots', () => {
  it('generates 15 minute slots with a 5 minute buffer from 10:00 to 17:00', () => {
    const slots = listSlots('2026-05-27');
    expect(slots).toHaveLength(21);
    expect(slots[0].start).toBe('10:00');
    expect(slots[0].end).toBe('10:15');
    expect(slots[1].start).toBe('10:20');
    expect(slots[slots.length - 1].start).toBe('16:40');
  });
});

describe('sponsor interests', () => {
  it('gives every sponsor two to four interests', () => {
    const sponsors = listSponsors().flatMap((tier) => tier.sponsors);
    expect(sponsors.length).toBeGreaterThan(0);
    for (const sponsor of sponsors) {
      expect(sponsor.interestIds.length).toBeGreaterThanOrEqual(2);
      expect(sponsor.interestIds.length).toBeLessThanOrEqual(4);
      for (const interestId of sponsor.interestIds) {
        expect(getInterest(interestId)).toBeDefined();
      }
    }
  });
});
