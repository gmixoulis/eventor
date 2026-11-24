import { describe, expect, it } from '@jest/globals';

import { getGoal } from '@/data';
import { lexicalEmbedder } from '@/matching/embedder';
import { buildSponsorVector, scoreSponsors, type SponsorInput } from '@/matching/sponsors';
import type { MatchProfile } from '@/matching/types';
import { buildInterestVectors, buildVectors } from '@/matching/vectors';

const fintech = 'group-industry-fintech';
const travel = 'group-industry-travel';

function profile(id: string, selections: MatchProfile['selections'], text = ''): MatchProfile {
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

describe('scoreSponsors', () => {
  it('ranks a sponsor with a shared interest first and names the interest', async () => {
    const embedder = lexicalEmbedder([fintech, travel]);
    const interestVec = await buildInterestVectors(embedder);
    const me = profile('me', [{ interestId: fintech, goalId: 'get-investment' }], 'fintech');
    const meVec = buildVectors(me, { interestVec, textVec: undefined, goals: getGoal });

    const sponsors: SponsorInput[] = [
      { id: 'bank', description: 'Backing founders with capital.', interestIds: [fintech] },
      { id: 'airline', description: 'Flying attendees from across Europe.', interestIds: [travel] },
    ];
    const sponsorText = await embedder.embed(sponsors.map((s) => s.description));

    const scored = scoreSponsors({
      me,
      meVec,
      sponsors,
      interestVec,
      sponsorText,
      interestName: (id) => id,
    });

    expect(scored[0].sponsorId).toBe('bank');
    expect(scored[0].reasons).toContain(`Matches your interest in ${fintech}`);
    expect(scored[1].reasons.length).toBeGreaterThan(0);
  });

  it('spreads a sponsor interest across every block so goals match too', async () => {
    const embedder = lexicalEmbedder([fintech]);
    const interestVec = await buildInterestVectors(embedder);
    const vec = buildSponsorVector([fintech], interestVec, embedder.dimensions);
    expect(vec.length).toBe(embedder.dimensions * 5);
    expect(vec.some((value) => value !== 0)).toBe(true);
  });
});
