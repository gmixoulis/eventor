import { describe, expect, it } from '@jest/globals';

import { makeDefaultMatching } from '@/backend/state';
import { getPerson, listInterests } from '@/data';
import { getEmbedder, vectorsFor } from '@/matching/active';
import { buildOthers, toMatchProfile } from '@/matching/inputs';
import { candidateFeatures, matchCorpus } from '@/matching/pipeline';
import { pairScore } from '@/matching/rules';
import { isSameOwner, pairFeatures, prepareLearning, type LearningOwner } from '@/store/learning';

const others = buildOthers();
const me = { ...others[0], id: 'me' };
const them = toMatchProfile(getPerson(others[1].id)!);
const input = { me, them, others, embedderId: getEmbedder().id, personId: them.id, signal: 'bookmark' as const };
const owner: LearningOwner = { accountId: 'acct-founder', generation: 1 };

describe('recording match feedback', () => {
  it('applies the update to the then-current ranker, not a snapshot', async () => {
    const update = await prepareLearning({
      owner,
      currentOwner: () => owner,
      buildVectors: () => vectorsFor(getEmbedder(), [me, them]),
      input,
    });
    const current = { ...makeDefaultMatching(), ranker: { ...makeDefaultMatching().ranker, updates: 7 } };
    expect(update!(current).ranker.updates).toBe(8);
    expect(update!(current).feedback[0]).toMatchObject({ personId: them.id, signal: 'bookmark' });
  });

  it('drops the result when a reset or account switch happened during the await', async () => {
    let live = owner;
    const update = await prepareLearning({
      owner,
      currentOwner: () => live,
      buildVectors: async () => {
        live = { accountId: 'acct-founder', generation: 2 };
        return vectorsFor(getEmbedder(), [me, them]);
      },
      input,
    });
    expect(update).toBeNull();
    expect(isSameOwner(owner, { accountId: 'acct-investor', generation: 1 })).toBe(false);
    expect(isSameOwner(owner, { accountId: null, generation: 1 })).toBe(false);
  });

  it('resolves to null instead of rejecting when embedding fails', async () => {
    const result = prepareLearning({
      owner,
      currentOwner: () => owner,
      buildVectors: () => Promise.reject(new Error('model not loaded')),
      input,
    });
    await expect(result).resolves.toBeNull();
  });

  it('scores the pair against the same full corpus recommend() uses', async () => {
    const vectors = await vectorsFor(getEmbedder(), [me, them]);
    const now = new Date('2026-05-28T10:00:00Z');
    const rule = pairScore(me, them, matchCorpus(me, others), listInterests().length, now);
    const expected = candidateFeatures({
      me,
      them,
      meVec: vectors[me.id],
      themVec: vectors[them.id],
      taste: undefined,
      ruleScore: rule.score,
      now,
    });
    expect(pairFeatures({ me, them, others, vectors, now }, undefined)).toEqual(expected);
    const twoDoc = pairScore(me, them, [me.text, them.text], listInterests().length, now);
    expect(twoDoc.score).not.toBe(rule.score); // the old two-document corpus scored differently
  });
});
