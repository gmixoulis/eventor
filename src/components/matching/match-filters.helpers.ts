import type { FilterGroup } from '@/components/schedule/filter-sheet';
import { listGoals, listInterestGroups, listIntents } from '@/data';
import type { Person } from '@/data/types';
import type { Match } from '@/matching/types';

export type PeopleSort = 'best' | 'name' | 'company';
export const sortLabels: Record<PeopleSort, string> = { best: 'Best match', name: 'Name', company: 'Company' };

/** Options for the people screen's Interest and Goal filters, grouped by category or intent. */
export function matchFilterGroups(kind: 'interest' | 'goal'): FilterGroup[] {
  return kind === 'interest'
    ? listInterestGroups().map((group) => ({ id: group.id, name: group.name, options: group.interests }))
    : listIntents().map((intent) => ({
        id: intent.id,
        name: intent.name,
        options: listGoals()
          .filter((goal) => goal.intentId === intent.id)
          .map((goal) => ({ id: goal.id, name: goal.label })),
      }));
}

export function sortPeople(people: Person[], sort: PeopleSort, byPerson: Record<string, Match>): Person[] {
  return [...people].sort((a, b) => {
    if (sort === 'best') {
      const first = byPerson[a.id];
      const second = byPerson[b.id];
      if (first && !second) return -1;
      if (!first && second) return 1;
      if (first && second && first.score !== second.score) return second.score - first.score;
    }
    if (sort === 'company') {
      const company = a.company.localeCompare(b.company);
      if (company) return company;
    }
    return a.name.localeCompare(b.name);
  });
}

/** People the user marked "Not relevant" are left out (People screen and search). */
export function withoutHidden(people: Person[], hidden: string[]): Person[] {
  return people.filter((person) => !hidden.includes(person.id));
}
