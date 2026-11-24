import { describe, expect, it } from '@jest/globals';

import { matchFilterGroups, sortPeople, withoutHidden } from '@/components/matching/match-filters.helpers';
import { listGoals, listInterestGroups, listIntents } from '@/data';
import type { Person } from '@/data/types';
import type { Match } from '@/matching/types';

function person(id: string, name: string, company: string): Person {
  return {
    id,
    name,
    company,
    role: 'Startup',
    title: '',
    intro: '',
    industry: '',
    countries: [],
    selections: [],
    lastActiveAt: '',
  };
}

const match = (personId: string, score: number): Match => ({
  personId,
  p: 0,
  score,
  tier: null,
  reasons: [],
});

const ann = person('a', 'Ann', 'Zeta');
const bob = person('b', 'Bob', 'Alpha');
const cy = person('c', 'Cy', 'Alpha');
const dee = person('d', 'Dee', 'Mid');

describe('sortPeople', () => {
  const byPerson = { a: match('a', 1), b: match('b', 5), c: match('c', 5) };

  it('best: higher score first, matched before unmatched, ties and unmatched by name', () => {
    const result = sortPeople([dee, cy, ann, bob], 'best', byPerson).map((p) => p.id);
    expect(result).toEqual(['b', 'c', 'a', 'd']);
  });

  it('best: orders two unmatched people by name', () => {
    expect(sortPeople([dee, ann], 'best', {}).map((p) => p.id)).toEqual(['a', 'd']);
  });

  it('name: ignores matches', () => {
    expect(sortPeople([dee, cy, ann, bob], 'name', byPerson).map((p) => p.id)).toEqual([
      'a', 'b', 'c', 'd',
    ]);
  });

  it('company: sorts by company then name', () => {
    expect(sortPeople([ann, dee, cy, bob], 'company', byPerson).map((p) => p.id)).toEqual([
      'b', 'c', 'd', 'a',
    ]);
  });

  it('does not mutate the input', () => {
    const input = [dee, ann];
    sortPeople(input, 'name', {});
    expect(input).toEqual([dee, ann]);
  });
});

describe('withoutHidden', () => {
  it('drops hidden ids and keeps order', () => {
    expect(withoutHidden([ann, bob, cy], ['b']).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('returns everyone when nothing is hidden', () => {
    expect(withoutHidden([ann, bob], [])).toHaveLength(2);
  });
});

describe('matchFilterGroups', () => {
  it('interest: one group per interest group with its interests as options', () => {
    const groups = matchFilterGroups('interest');
    const source = listInterestGroups();
    expect(groups).toHaveLength(source.length);
    expect(groups[0]).toEqual({ id: source[0].id, name: source[0].name, options: source[0].interests });
  });

  it('goal: one group per intent holding only that intent goals, labelled by goal label', () => {
    const groups = matchFilterGroups('goal');
    expect(groups).toHaveLength(listIntents().length);
    for (const group of groups) {
      const expected = listGoals().filter((g) => g.intentId === group.id);
      expect(group.options).toEqual(expected.map((g) => ({ id: g.id, name: g.label })));
    }
  });
});
