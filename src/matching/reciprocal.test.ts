import { describe, expect, it } from '@jest/globals';

import { getGoal } from '@/data';
import { lexicalEmbedder } from '@/matching/embedder';
import { reciprocal } from '@/matching/reciprocal';
import type { MatchProfile, Selection } from '@/matching/types';
import { buildInterestVectors, buildVectors, interestLabels } from '@/matching/vectors';

function profile(id: string, selections: Selection[]): MatchProfile {
  return {
    id,
    selections,
    text: '',
    industry: '',
    acceptedMeetings: 0,
    staleRequests: 0,
    freeSlotRatio: 1,
  };
}

const fintech = 'group-industry-fintech';

describe('reciprocal', () => {
  it('ranks a mutual pair above a one-sided pair', async () => {
    const labels = interestLabels();
    const embedder = lexicalEmbedder(labels.map((l) => l.label));
    const interestVec = await buildInterestVectors(embedder);

    const mutualA = profile('mutual-a', [
      { interestId: fintech, goalId: 'get-investment' },
      { interestId: fintech, goalId: 'invest' },
    ]);
    const mutualB = profile('mutual-b', [
      { interestId: fintech, goalId: 'invest' },
      { interestId: fintech, goalId: 'get-investment' },
    ]);
    const oneSidedA = profile('onesided-a', [{ interestId: fintech, goalId: 'get-investment' }]);
    const oneSidedB = profile('onesided-b', [{ interestId: fintech, goalId: 'invest' }]);

    const build = (p: MatchProfile) =>
      buildVectors(p, { interestVec, textVec: undefined, goals: getGoal });

    const mutual = reciprocal(build(mutualA), build(mutualB));
    const oneSided = reciprocal(build(oneSidedA), build(oneSidedB));

    expect(mutual.ab).toBeGreaterThan(0);
    expect(mutual.ba).toBeGreaterThan(0);
    expect(oneSided.ba).toBe(0);
    expect(mutual.complementary).toBeGreaterThan(oneSided.complementary);
  });
});
