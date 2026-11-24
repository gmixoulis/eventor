import { describe, expect, it } from '@jest/globals';

import { CROWD_LEVELS, CROWD_META, crowdLevel } from '@/components/venue/crowd-demo';

describe('crowd-demo', () => {
  it('marks the main hall as the busiest (the red demo case)', () => {
    expect(crowdLevel('place-hudson')).toBe('high');
  });

  it('gives a quiet hall a low level', () => {
    expect(crowdLevel('place-cinema')).toBe('low');
  });

  it('returns null for a place with no simulated level', () => {
    expect(crowdLevel('place-registration')).toBeNull();
    expect(crowdLevel('nope')).toBeNull();
  });

  it('has a label and caption for every level', () => {
    for (const level of CROWD_LEVELS) expect(CROWD_META[level]).toMatchObject({ word: expect.any(String), caption: expect.any(String) });
  });
});
