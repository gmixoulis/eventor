import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_GOAL,
  canApplySelections,
  filterGroups,
  goalChoices,
  goalTag,
  hintFlags,
  interestsStepValid,
  introStepErrors,
  introStepValid,
  removeInterest,
  setGoal,
  tapAction,
} from '@/components/matching/goals';
import { listGoals, listInterestGroups, listInterests } from '@/data';
import type { Interest, Selection } from '@/data/types';

const groups = listInterestGroups();
const firstOf = (groupId: string): Interest => {
  const interest = groups.find((g) => g.id === groupId)?.interests[0];
  if (!interest) throw new Error(`no interest in ${groupId}`);
  return interest;
};
const networkingOnly: Interest = { id: 'x-only', name: 'Only', categoryId: 'x', intents: ['networking'] };
const industry = firstOf('group-industry');

describe('tapAction', () => {
  it('toggles a networking-only interest on and off', () => {
    expect(tapAction(networkingOnly, false)).toBe('toggle-on');
    expect(tapAction(networkingOnly, true)).toBe('toggle-off');
  });

  it('opens the goal sheet for an interest with more intents, selected or not', () => {
    expect(tapAction(industry, false)).toBe('open-sheet');
    expect(tapAction(industry, true)).toBe('open-sheet');
  });
});

describe('selection list updates', () => {
  const start: Selection[] = [{ interestId: 'a', goalId: 'network' }];

  it('adds a networking-only interest with the networking goal', () => {
    expect(setGoal(start, 'b', DEFAULT_GOAL)).toEqual([...start, { interestId: 'b', goalId: 'network' }]);
  });

  it('adds an interest with a chosen goal', () => {
    expect(setGoal(start, 'b', 'invest')).toEqual([...start, { interestId: 'b', goalId: 'invest' }]);
  });

  it('changes the goal of a selected interest in place, without duplicating it', () => {
    const two: Selection[] = [...start, { interestId: 'b', goalId: 'invest' }];
    expect(setGoal(two, 'a', 'sell')).toEqual([
      { interestId: 'a', goalId: 'sell' },
      { interestId: 'b', goalId: 'invest' },
    ]);
  });

  it('removes an interest and leaves the rest', () => {
    const two: Selection[] = [...start, { interestId: 'b', goalId: 'invest' }];
    expect(removeInterest(two, 'a')).toEqual([{ interestId: 'b', goalId: 'invest' }]);
    expect(removeInterest(two, 'missing')).toEqual(two);
  });
});

describe('canApplySelections (keep at least one interest)', () => {
  it('blocks an empty list when networking is on', () => {
    expect(canApplySelections([], true)).toBe(false);
    expect(canApplySelections([{ interestId: 'a', goalId: 'network' }], true)).toBe(true);
  });

  it('allows an empty list when networking is off', () => {
    expect(canApplySelections([], false)).toBe(true);
  });
});

describe('goalChoices', () => {
  const shape = (interest: Interest) =>
    goalChoices(interest).map(({ intent, goals }) => [intent.id, goals.map((g) => g.id)]);

  it('offers all four intents for Industry, in seed order', () => {
    expect(shape(industry)).toEqual([
      ['networking', ['network']],
      ['trading', ['buy', 'sell']],
      ['investment', ['get-investment', 'invest']],
      ['recruitment', ['get-job', 'offer-job']],
    ]);
  });

  it('offers networking and investment for Startup Stage and Investment Type', () => {
    const expected = [
      ['networking', ['network']],
      ['investment', ['get-investment', 'invest']],
    ];
    expect(shape(firstOf('group-startup-stage'))).toEqual(expected);
    expect(shape(firstOf('group-investment-type'))).toEqual(expected);
  });

  it('offers networking, recruitment and mentoring for Film & Music Roles', () => {
    expect(shape(firstOf('group-film-music'))).toEqual([
      ['networking', ['network']],
      ['recruitment', ['get-job', 'offer-job']],
      ['mentoring', ['find-mentor', 'be-mentor']],
    ]);
  });

  it('is the same on every call', () => {
    expect(shape(industry)).toEqual(shape(industry));
  });
});

describe('goalTag', () => {
  it('has no tag for networking and a short tag for each other goal', () => {
    const tags = Object.fromEntries(listGoals().map((g) => [g.id, goalTag(g.id)]));
    expect(tags).toEqual({
      network: '',
      buy: 'Buy',
      sell: 'Sell',
      'get-investment': 'Seeking investment',
      invest: 'Invest',
      'get-job': 'Seeking a job',
      'offer-job': 'Hiring',
      'find-mentor': 'Seeking a mentor',
      'be-mentor': 'Mentor',
    });
    expect(listGoals()).toHaveLength(9);
  });
});

describe('filterGroups', () => {
  it('returns every group for an empty or blank query', () => {
    expect(filterGroups(groups, '  ')).toEqual(groups);
  });

  it('matches by interest name, case-insensitively, and hides groups with no match', () => {
    const result = filterGroups(groups, 'FINTECH');
    expect(result.map((g) => g.id)).toEqual(['group-industry']);
    expect(result[0].interests.map((i) => i.name)).toEqual(['Fintech']);
  });

  it('keeps each group that has a match', () => {
    const result = filterGroups(groups, 'series a');
    expect(result.map((g) => g.id)).toEqual(['group-startup-stage', 'group-investment-type']);
  });

  it('returns nothing when no interest matches', () => {
    expect(filterGroups(groups, 'zzz')).toEqual([]);
  });
});

describe('hintFlags', () => {
  const total = listInterests().length;
  const many = Math.ceil(total * 0.5);

  it('flags over-selection only', () => {
    expect(hintFlags(many, total, 'I build things')).toEqual({ tooMany: true, noIntro: false });
  });

  it('flags an empty or blank introduction only', () => {
    expect(hintFlags(1, total, '   ')).toEqual({ tooMany: false, noIntro: true });
  });

  it('flags both', () => {
    expect(hintFlags(many, total, '')).toEqual({ tooMany: true, noIntro: true });
  });

  it('flags neither', () => {
    expect(hintFlags(1, total, 'I build things')).toEqual({ tooMany: false, noIntro: false });
  });

  it('does not count zero selections as over-selection', () => {
    expect(hintFlags(0, total, 'I build things').tooMany).toBe(false);
  });
});

describe('onboarding step validation', () => {
  const ok = { intro: 'I build things', role: 'Startup', industry: 'Fintech' };

  it('step 1 passes with all three fields valid', () => {
    expect(introStepValid(ok)).toBe(true);
  });

  it('step 1 blocks on an empty or over-280-character introduction', () => {
    expect(introStepValid({ ...ok, intro: '  ' })).toBe(false);
    expect(introStepValid({ ...ok, intro: 'a'.repeat(281) })).toBe(false);
    expect(introStepValid({ ...ok, intro: 'a'.repeat(280) })).toBe(true);
    expect(introStepErrors({ ...ok, intro: 'a'.repeat(281) }).intro).not.toBeNull();
  });

  it('step 1 blocks on a missing role or industry', () => {
    expect(introStepValid({ ...ok, role: '' })).toBe(false);
    expect(introStepValid({ ...ok, industry: '' })).toBe(false);
    expect(introStepErrors({ ...ok, role: '' }).role).not.toBeNull();
  });

  it('step 2 blocks on zero interests', () => {
    expect(interestsStepValid([])).toBe(false);
    expect(interestsStepValid([{ interestId: 'a', goalId: 'network' }])).toBe(true);
  });
});
