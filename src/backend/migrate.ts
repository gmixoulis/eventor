import { listInterests } from '@/data';
import type { Selection } from '@/data/types';

export function migrateInterestsToSelections(interests: unknown): Selection[] {
  if (!Array.isArray(interests)) return [];
  const firstByName = new Map<string, string>();
  for (const interest of listInterests()) {
    if (!firstByName.has(interest.name)) firstByName.set(interest.name, interest.id);
  }
  const selections: Selection[] = [];
  for (const name of interests) {
    if (typeof name !== 'string') continue;
    const id = firstByName.get(name);
    if (id) selections.push({ interestId: id, goalId: 'network' });
  }
  return selections;
}

export function migrateProfileSelections(stored: unknown): Selection[] {
  const profile = (stored ?? {}) as { selections?: unknown; interests?: unknown };
  if (Array.isArray(profile.selections)) return profile.selections as Selection[];
  if (Array.isArray(profile.interests)) return migrateInterestsToSelections(profile.interests);
  return [];
}
