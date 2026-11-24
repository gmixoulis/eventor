import { getGoal, getInterest, listInterests, listInterestGroups, listIntents } from '@/data';
import type { Selection } from '@/matching/types';

export type StatPerson = {
  id: string;
  selections: Selection[];
  networking?: boolean;
};

export type MatchmakingStats = {
  peoplePerIntent: { intentId: string; name: string; count: number }[];
  topInterests: { interestId: string; name: string; count: number }[];
  totalsPerCategory: { categoryId: string; name: string; count: number }[];
  optedOutNetworking: number;
  overSelected: number;
};

function intentsOf(person: StatPerson): Set<string> {
  const set = new Set<string>();
  for (const selection of person.selections) {
    set.add(getGoal(selection.goalId)?.intentId ?? 'networking');
  }
  return set;
}

/** Aggregates sample people plus the demo accounts (whose profiles carry a networking flag). */
export function aggregateStats(sample: StatPerson[], accounts: StatPerson[]): MatchmakingStats {
  const everyone = [...sample, ...accounts];

  const peoplePerIntent = listIntents().map((intent) => ({
    intentId: intent.id,
    name: intent.name,
    count: everyone.filter((person) => intentsOf(person).has(intent.id)).length,
  }));

  const interestCounts = new Map<string, number>();
  for (const person of everyone) {
    for (const selection of person.selections) {
      interestCounts.set(selection.interestId, (interestCounts.get(selection.interestId) ?? 0) + 1);
    }
  }
  const topInterests = [...interestCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([interestId, count]) => ({
      interestId,
      name: getInterest(interestId)?.name ?? interestId,
      count,
    }));

  const totalsPerCategory = listInterestGroups().map((group) => ({
    categoryId: group.id,
    name: group.name,
    count: everyone.filter((person) =>
      person.selections.some((selection) =>
        group.interests.some((interest) => interest.id === selection.interestId),
      ),
    ).length,
  }));

  const totalInterests = listInterests().length;
  const overSelected = everyone.filter(
    (person) => person.selections.length > totalInterests * 0.2,
  ).length;

  return {
    peoplePerIntent,
    topInterests,
    totalsPerCategory,
    optedOutNetworking: accounts.filter((account) => account.networking === false).length,
    overSelected,
  };
}
