import { describe, expect, it } from '@jest/globals';

import { cosine } from '@/matching/embedder';
import { updateTaste } from '@/matching/taste';

const candidate: number[] = [1, 0, 0];
const taste: number[] = [0, 1, 0];

describe('updateTaste', () => {
  it('moves toward the candidate on a positive label', () => {
    const updated = updateTaste([...taste], [...candidate], 1, 1);
    expect(cosine(updated, candidate)).toBeGreaterThan(cosine(taste, candidate));
  });

  it('moves away from the candidate on a negative label', () => {
    const updated = updateTaste([...taste], [...candidate], 0, 1);
    expect(cosine(updated, candidate)).toBeLessThan(cosine(taste, candidate));
  });

  it('starts from the candidate when there is no prior taste', () => {
    const updated = updateTaste(undefined, [...candidate], 1, 1);
    expect(cosine(updated, candidate)).toBeCloseTo(1, 9);
  });
});
