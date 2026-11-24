// Pure decisions behind the interest picker, goal sheet, hint and onboarding steps.
import { introError, requiredError } from '@/components/account/validators';
import { getGoal, listGoals, listIntents } from '@/data';
import type { Goal, Intent, Interest, InterestGroup, Selection } from '@/data/types';
import { overSelectionFactor } from '@/matching/rules';

export const DEFAULT_GOAL = 'network';

/** Short goal tag shown after an interest's name (picker and profile). Networking has none. */
export function goalTag(goalId: string): string {
  return getGoal(goalId)?.shortLabel ?? '';
}

export type TapAction = 'toggle-on' | 'toggle-off' | 'open-sheet';

/** Networking-only interests toggle; any interest with more intents opens the goal sheet. */
export function tapAction(interest: Interest, selected: boolean): TapAction {
  if (interest.intents.length > 1) return 'open-sheet';
  return selected ? 'toggle-off' : 'toggle-on';
}

export function goalOf(selections: Selection[], interestId: string): string | undefined {
  return selections.find((s) => s.interestId === interestId)?.goalId;
}

export function removeInterest(selections: Selection[], interestId: string): Selection[] {
  return selections.filter((s) => s.interestId !== interestId);
}

/** Adds the interest with the goal, or changes its goal in place when already selected. */
export function setGoal(selections: Selection[], interestId: string, goalId: string): Selection[] {
  return goalOf(selections, interestId)
    ? selections.map((s) => (s.interestId === interestId ? { interestId, goalId } : s))
    : [...selections, { interestId, goalId }];
}

/** With networking on, at least one interest must stay selected so others can find you. */
export function canApplySelections(next: Selection[], networking: boolean): boolean {
  return !networking || next.length > 0;
}

/** Goals the interest allows, grouped by intent, both in seed order. */
export function goalChoices(interest: Interest): { intent: Intent; goals: Goal[] }[] {
  const goals = listGoals();
  return listIntents()
    .filter((intent) => interest.intents.includes(intent.id))
    .map((intent) => ({ intent, goals: goals.filter((g) => g.intentId === intent.id) }));
}

/** Case-insensitive name search; groups with no match are dropped. */
export function filterGroups(groups: InterestGroup[], query: string): InterestGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      interests: group.interests.filter((i) => i.name.toLowerCase().includes(q)),
    }))
    .filter((group) => group.interests.length > 0);
}

export function hintFlags(
  selected: number,
  total: number,
  intro: string,
): { tooMany: boolean; noIntro: boolean } {
  return {
    // Zero selections also gives a factor below 1, but that is not over-selection.
    tooMany: selected > 0 && overSelectionFactor(selected, total) < 1,
    noIntro: !intro.trim(),
  };
}

export function introStepErrors(fields: { intro: string; role: string; industry: string }) {
  return {
    intro: introError(fields.intro),
    role: requiredError(fields.role),
    industry: requiredError(fields.industry),
  };
}

export function introStepValid(fields: { intro: string; role: string; industry: string }): boolean {
  const errors = introStepErrors(fields);
  return !errors.intro && !errors.role && !errors.industry;
}

export function interestsStepValid(selections: Selection[]): boolean {
  return selections.length > 0;
}
