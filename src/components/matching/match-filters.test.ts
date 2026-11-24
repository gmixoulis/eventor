import { describe, expect, it } from '@jest/globals';

import { goalTag } from '@/components/matching/goals';
import { sortPeople, withoutHidden } from '@/components/matching/match-filters.helpers';
import { listGoals, listPeople } from '@/data';
import type { Person } from '@/data/types';
import type { Match } from '@/matching/types';

const person = (id: string, name: string, company: string): Person => ({
  id, name, company, title: '', intro: '', industry: '', countries: [], selections: [],
  role: 'Startup', lastActiveAt: '',
});
const match = (personId: string, score: number): Match => ({
  personId, score, p: score / 100, tier: null, reasons: [],
});
const people = [person('z', 'Zoe', 'Alpha'), person('b', 'Ben', 'Zulu'), person('a', 'Amy', 'Alpha'), person('d', 'Dee', 'Beta')];

describe('people sorting', () => {
  it('puts matches in score order, including zero, then unmatched people alphabetically', () => {
    const result = sortPeople(people, 'best', { z: match('z', 0), d: match('d', 80) });
    expect(result.map((p) => p.id)).toEqual(['d', 'z', 'a', 'b']);
    expect(people.map((p) => p.id)).toEqual(['z', 'b', 'a', 'd']);
  });
  it('breaks equal scores by name', () => {
    expect(sortPeople(people, 'best', { z: match('z', 50), a: match('a', 50) }).map((p) => p.id))
      .toEqual(['a', 'z', 'b', 'd']);
  });
  it('sorts by name', () => {
    expect(sortPeople(people, 'name', {}).map((p) => p.id)).toEqual(['a', 'b', 'd', 'z']);
  });
  it('sorts by company with name as a tie breaker', () => {
    expect(sortPeople(people, 'company', {}).map((p) => p.id)).toEqual(['a', 'z', 'd', 'b']);
  });
});

describe('the listPeople filters used by People', () => {
  const all = listPeople();
  const interestId = 'group-industry-fintech';
  const goalId = 'invest';

  it('filters by interest', () => {
    const expected = all.filter((p) => p.selections.some((s) => s.interestId === interestId));
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(all.length);
    expect(listPeople('', { interestIds: [interestId] })).toEqual(expected);
  });
  it('filters by goal', () => {
    const expected = all.filter((p) => p.selections.some((s) => s.goalId === goalId));
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(all.length);
    expect(listPeople('', { goalIds: [goalId] })).toEqual(expected);
  });
  it('combines interest and goal filters', () => {
    const expected = all.filter((p) => p.selections.some((s) => s.interestId === interestId)
      && p.selections.some((s) => s.goalId === goalId));
    expect(expected.length).toBeGreaterThan(0);
    expect(listPeople('', { interestIds: [interestId], goalIds: [goalId] })).toEqual(expected);
    expect(listPeople('', { interestIds: ['missing'], goalIds: [goalId] })).toEqual([]);
  });
  it('accepts any selected interest or goal and combines search', () => {
    const filtered = listPeople('', { interestIds: [interestId, 'missing'], goalIds: ['buy', goalId] });
    expect(filtered.length).toBeGreaterThan(0);
    const target = filtered[0];
    expect(listPeople(target.name, { interestIds: [interestId, 'missing'], goalIds: ['buy', goalId] })).toEqual([target]);
  });
  it('keeps all people when filters are empty', () => {
    expect(listPeople('', { interestIds: [], goalIds: [] })).toEqual(all);
  });
});

describe('goal short forms', () => {
  const expected: Record<string, string> = {
    network: '', buy: 'Buy', sell: 'Sell', 'get-investment': 'Seeking investment',
    invest: 'Invest', 'get-job': 'Seeking a job', 'offer-job': 'Hiring',
    'find-mentor': 'Seeking a mentor', 'be-mentor': 'Mentor',
  };
  it('covers all nine goals', () => {
    expect(listGoals().map((goal) => goal.id).sort()).toEqual(Object.keys(expected).sort());
  });
  it.each(Object.entries(expected))('%s has the expected label', (id, label) => {
    expect(goalTag(id)).toBe(label);
  });
});

describe('withoutHidden', () => {
  it('drops people marked not relevant and keeps the rest in order', () => {
    const people = [person('a', 'Ann', 'X'), person('b', 'Bob', 'Y'), person('c', 'Cy', 'Z')];
    expect(withoutHidden(people, ['b']).map((p) => p.id)).toEqual(['a', 'c']);
  });
});
