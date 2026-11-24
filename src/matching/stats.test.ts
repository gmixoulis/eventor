import { describe, expect, it } from '@jest/globals';

import { listIntents, listPeople } from '@/data';
import { aggregateStats, type StatPerson } from '@/matching/stats';

const accounts: StatPerson[] = [
  {
    id: 'acct-a',
    networking: false,
    selections: [
      { interestId: 'group-industry-fintech', goalId: 'invest' },
      { interestId: 'group-industry-fintech', goalId: 'network' },
    ],
  },
  {
    id: 'acct-b',
    networking: true,
    selections: [{ interestId: 'group-industry-travel', goalId: 'network' }],
  },
];

describe('aggregateStats', () => {
  it('reports one row per intent', () => {
    const stats = aggregateStats(listPeople(), accounts);
    expect(stats.peoplePerIntent.map((row) => row.intentId)).toEqual(
      listIntents().map((intent) => intent.id),
    );
    expect(
      stats.peoplePerIntent.find((row) => row.intentId === 'networking')?.count,
    ).toBeGreaterThan(0);
  });

  it('returns the top interests sorted by count', () => {
    const stats = aggregateStats(listPeople(), accounts);
    expect(stats.topInterests).toHaveLength(10);
    const counts = stats.topInterests.map((row) => row.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('counts accounts that opted out of networking', () => {
    const stats = aggregateStats(listPeople(), accounts);
    expect(stats.optedOutNetworking).toBe(1);
  });

  it('counts people who selected more than 20 percent of interests', () => {
    const stats = aggregateStats(listPeople(), accounts);
    expect(stats.overSelected).toBeGreaterThan(0);
  });
});
