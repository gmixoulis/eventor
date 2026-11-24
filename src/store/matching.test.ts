import { describe, expect, it } from '@jest/globals';

import { applyFeedback, resolveTaste } from '@/matching/feedback';
import { priorState } from '@/matching/ranker';
import { PRIOR_WEIGHTS } from '@/matching/weights';

describe('matching store transitions', () => {
  it('recording request_sent changes ranker.updates', () => {
    const ranker = priorState();
    const x = [1, 0, 0, 0, 0, 0, 0, 1, 1, 0.5, 1, 0];
    const next = applyFeedback({ ranker, taste: undefined }, x, undefined, 'request_sent');
    expect(next.ranker.updates).toBe(ranker.updates + 1);
  });

  it('resetLearning restores the priors', () => {
    expect(priorState().weights).toEqual(PRIOR_WEIGHTS);
    expect(priorState().updates).toBe(0);
  });

  it('a changed embedderId discards taste only', () => {
    const taste = [0.1, 0.2, 0.3];
    expect(resolveTaste('lexical', 'lexical', taste)).toEqual(taste);
    expect(resolveTaste('lexical', 'neural', taste)).toBeUndefined();
  });
});
