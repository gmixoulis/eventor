import { describe, expect, it } from '@jest/globals';

import { getGoal } from '@/data';
import { lexicalEmbedder } from '@/matching/embedder';
import { reciprocal } from '@/matching/reciprocal';
import type { MatchProfile, Selection } from '@/matching/types';
import { buildInterestVectors, buildVectors, interestLabels } from '@/matching/vectors';

function profile(id: string, selections: Selection[], text = ''): MatchProfile {
  return {
    id,
    selections,
    text,
    industry: '',
    acceptedMeetings: 0,
    staleRequests: 0,
    freeSlotRatio: 1,
  };
}

const fintech = 'group-industry-fintech';

describe('buildVectors', () => {
  it('keeps investment and recruitment intents apart', async () => {
    const labels = interestLabels();
    const embedder = lexicalEmbedder(labels.map((l) => l.label));
    const interestVec = await buildInterestVectors(embedder);

    const founder = profile('founder', [{ interestId: fintech, goalId: 'get-investment' }]);
    const investor = profile('investor', [{ interestId: fintech, goalId: 'invest' }]);
    const recruiter = profile('recruiter', [{ interestId: fintech, goalId: 'offer-job' }]);

    const founderVec = buildVectors(founder, { interestVec, textVec: undefined, goals: getGoal });
    const investorVec = buildVectors(investor, { interestVec, textVec: undefined, goals: getGoal });
    const recruiterVec = buildVectors(recruiter, {
      interestVec,
      textVec: undefined,
      goals: getGoal,
    });

    const investment = reciprocal(founderVec, investorVec);
    const recruitment = reciprocal(founderVec, recruiterVec);

    expect(investment.complementary).toBeGreaterThan(0);
    expect(recruitment.complementary).toBe(0);
    expect(recruitment.networking).toBe(0);
    expect(recruitment.text).toBe(0);
  });
});
