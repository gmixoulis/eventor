import { describe, expect, it } from '@jest/globals';

import { migrateInterestsToSelections, migrateProfileSelections } from '@/backend/migrate';

describe('store migration', () => {
  it('maps old interest names to selections and drops unknown names', () => {
    const selections = migrateInterestsToSelections([
      'Fintech',
      'Series A',
      'Not A Real Interest',
      'Music',
    ]);
    expect(selections).toHaveLength(3);
    expect(selections.every((s) => s.goalId === 'network')).toBe(true);
    const ids = selections.map((s) => s.interestId);
    expect(ids).toContain('group-industry-fintech');
    expect(ids).toContain('group-startup-stage-series-a');
    expect(ids).toContain('group-industry-music');
  });

  it('falls back to an empty array on unexpected input', () => {
    expect(migrateInterestsToSelections('nope')).toEqual([]);
    expect(migrateInterestsToSelections(undefined)).toEqual([]);
    expect(migrateInterestsToSelections([42, null])).toEqual([]);
    expect(migrateProfileSelections(null)).toEqual([]);
  });

  it('keeps an existing selections array', () => {
    const existing = [{ interestId: 'x', goalId: 'invest' }];
    expect(migrateProfileSelections({ selections: existing })).toEqual(existing);
  });
});
