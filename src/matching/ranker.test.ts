import { describe, expect, it } from '@jest/globals';

import { getEmbedder, setEmbedder, vectorsFor } from '@/matching/active';
import { lexicalEmbedder } from '@/matching/embedder';
import { buildOthers, profileText } from '@/matching/inputs';
import { recommend } from '@/matching/pipeline';
import { predict, priorState, update } from '@/matching/ranker';
import type { Match, MatchProfile, Selection } from '@/matching/types';
import { interestLabels } from '@/matching/vectors';
import { PRIOR_WEIGHTS, WEIGHTS } from '@/matching/weights';

const NOW = new Date('2026-05-27T12:00:00');

/** The app's path: the active embedder, cached vectors, then the pipeline with prior weights. */
async function rankMatches(me: MatchProfile, others: MatchProfile[], now: Date): Promise<Match[]> {
  const corpus = [me.text, ...others.map((o) => o.text), ...interestLabels().map((l) => l.label)];
  setEmbedder(lexicalEmbedder(corpus));
  const vectors = await vectorsFor(getEmbedder(), [me, ...others]);
  return recommend({ me, others, vectors, ranker: priorState(), now });
}

const referenceSelections: Selection[] = [
  { interestId: 'group-industry-fintech', goalId: 'get-investment' },
  { interestId: 'group-startup-stage-early-stage-pre-seed-and-seed', goalId: 'get-investment' },
  { interestId: 'group-industry-media', goalId: 'network' },
];

function referenceProfile(): MatchProfile {
  return {
    id: 'me',
    selections: referenceSelections,
    text: profileText({
      id: 'me',
      selections: referenceSelections,
      intro: '',
      title: 'CEO',
      company: 'Demo Company',
      industry: '',
    }),
    industry: '',
    acceptedMeetings: 0,
    staleRequests: 0,
    freeSlotRatio: 1,
  };
}

describe('ranker', () => {
  it('with prior weights, complementary matches come first', async () => {
    const ranked = await rankMatches(referenceProfile(), buildOthers(), NOW);
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranked[0].reasons.some((r) => r.kind === 'complementary')).toBe(true);
  });

  it('learns in the right direction from taste-heavy signals', () => {
    const prior = priorState();
    const candidate = [1, 0, 0.1, 0.3, 0.9, 0, 0, 1, 1, 0.5, 1, 0.1];

    let learned = prior;
    for (let i = 0; i < 5; i++) learned = update(learned, candidate, 1, 1);
    expect(learned.weights[4]).toBeGreaterThan(prior.weights[4]);
    expect(predict(learned, candidate)).toBeGreaterThan(predict(prior, candidate));

    let hidden = learned;
    for (let i = 0; i < 5; i++) hidden = update(hidden, candidate, 0, 1);
    expect(hidden.weights[4]).toBeLessThan(learned.weights[4]);
    expect(predict(hidden, candidate)).toBeLessThan(predict(learned, candidate));
  });

  it('keeps weights inside the clamp through alternating updates', () => {
    const state = priorState();
    const candidate = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    let current = state;
    for (let i = 0; i < 200; i++) current = update(current, candidate, (i % 2) as 0 | 1, 1);
    for (const weight of current.weights) {
      expect(Math.abs(weight)).toBeLessThanOrEqual(WEIGHTS.weightClamp);
    }
  });

  it('priorState matches the declared prior weights', () => {
    expect(priorState().weights).toEqual(PRIOR_WEIGHTS);
  });
});
