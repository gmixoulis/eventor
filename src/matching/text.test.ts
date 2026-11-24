import { describe, expect, it } from '@jest/globals';

import { textSimilarity } from '@/matching/text';

describe('textSimilarity', () => {
  it('returns 1 for identical text', () => {
    const result = textSimilarity('building a marketplace', 'building a marketplace', [
      'building a marketplace',
    ]);
    expect(result.score).toBeCloseTo(1, 9);
  });

  it('returns 0 for texts with no shared stems', () => {
    const result = textSimilarity('apple orchard', 'banana smoothie', [
      'apple orchard',
      'banana smoothie',
    ]);
    expect(result.score).toBe(0);
    expect(result.terms).toEqual([]);
  });

  it('returns shared terms as original word forms', () => {
    const result = textSimilarity('building a marketplace', 'build a market', [
      'building a marketplace',
      'build a market',
    ]);
    expect(result.score).toBeGreaterThan(0);
    expect(result.terms.length).toBeGreaterThan(0);
    expect(result.terms).toContain('building');
  });
});
