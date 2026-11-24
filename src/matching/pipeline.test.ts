import { describe, expect, it } from '@jest/globals';

import { getGoal, getInterest } from '@/data';
import { getEmbedder, setEmbedder, vectorsFor } from '@/matching/active';
import { describeReason } from '@/matching/describe';
import { lexicalEmbedder } from '@/matching/embedder';
import { buildOthers, profileText } from '@/matching/inputs';
import { recommend } from '@/matching/pipeline';
import { priorState } from '@/matching/ranker';
import { overSelectionFactor } from '@/matching/rules';
import type { Match, MatchProfile, Selection } from '@/matching/types';
import { interestLabels } from '@/matching/vectors';
import { WEIGHTS } from '@/matching/weights';

const NOW = new Date('2026-05-27T12:00:00');

/** The app's path: the active embedder, cached vectors, then the pipeline with prior weights. */
async function rankMatches(me: MatchProfile, others: MatchProfile[], now: Date): Promise<Match[]> {
  const corpus = [me.text, ...others.map((o) => o.text), ...interestLabels().map((l) => l.label)];
  setEmbedder(lexicalEmbedder(corpus));
  const vectors = await vectorsFor(getEmbedder(), [me, ...others]);
  return recommend({ me, others, vectors, ranker: priorState(), now });
}

function profile(
  id: string,
  selections: Selection[],
  extra: Partial<MatchProfile> = {},
): MatchProfile {
  return {
    id,
    selections,
    text: '',
    industry: '',
    acceptedMeetings: 0,
    staleRequests: 0,
    freeSlotRatio: 1,
    ...extra,
  };
}

describe('rankMatches', () => {
  it('ranks complementary above shared networking above the same goal', async () => {
    const me = profile('me', [
      { interestId: 'a', goalId: 'get-investment' },
      { interestId: 'b', goalId: 'network' },
      { interestId: 'c', goalId: 'get-investment' },
    ]);
    const others = [
      profile('comp', [{ interestId: 'a', goalId: 'invest' }]),
      profile('net', [{ interestId: 'b', goalId: 'network' }]),
      profile('same', [{ interestId: 'c', goalId: 'get-investment' }]),
    ];
    const ranked = await rankMatches(me, others, NOW);
    expect(ranked.map((m) => m.personId)).toEqual(['comp', 'net', 'same']);
  });

  it('scores a related interest below the identical interest', async () => {
    const me = profile('me', [{ interestId: 'group-industry-fintech', goalId: 'get-investment' }]);
    const identical = profile('same', [{ interestId: 'group-industry-fintech', goalId: 'invest' }]);
    const related = profile('rel', [{ interestId: 'group-industry-legaltech', goalId: 'invest' }]);
    const ranked = await rankMatches(me, [related, identical], NOW);
    const scoreOf = (id: string) => ranked.find((m) => m.personId === id)!.score;
    expect(scoreOf('same')).toBeGreaterThan(scoreOf('rel'));
    expect(ranked.map((m) => m.personId)).toEqual(['same', 'rel']);
  });

  it('solo text match appears only above the threshold', async () => {
    const me = profile(
      'me',
      [{ interestId: 'a', goalId: 'network' }],
      { text: 'building a marketplace for small businesses' },
    );
    const unrelated = profile(
      'unrelated',
      [{ interestId: 'z', goalId: 'network' }],
      { text: 'completely unrelated words here' },
    );
    const matching = profile(
      'matching',
      [{ interestId: 'z', goalId: 'network' }],
      { text: 'building a marketplace for small businesses' },
    );
    const ranked = await rankMatches(me, [unrelated, matching], NOW);
    expect(ranked.map((m) => m.personId)).toEqual(['matching']);
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('adjusts for stale requests, recent activity and low free slots', async () => {
    const me = profile('me', [{ interestId: 'a', goalId: 'get-investment' }]);
    const base = profile('base', [{ interestId: 'a', goalId: 'invest' }]);
    const stale = profile('stale', [{ interestId: 'a', goalId: 'invest' }], { staleRequests: 1 });
    const recent = profile('recent', [{ interestId: 'a', goalId: 'invest' }], {
      lastActiveAt: '2026-05-25T12:00:00',
    });
    const lowFree = profile('low', [{ interestId: 'a', goalId: 'invest' }], { freeSlotRatio: 0.05 });
    const ranked = await rankMatches(me, [base, stale, recent, lowFree], NOW);
    const scoreOf = (id: string) => ranked.find((m) => m.personId === id)!.score;
    expect(scoreOf('stale')).toBeLessThan(scoreOf('base'));
    expect(scoreOf('recent')).toBeGreaterThan(scoreOf('base'));
    expect(scoreOf('low')).toBeLessThan(scoreOf('base'));
  });

  it('keeps a stable order for equal scores and applies tiers from topCount', async () => {
    const me = profile('me', [{ interestId: 'a', goalId: 'network' }]);
    const others = Array.from({ length: 14 }, (_, index) =>
      profile(`p${String(index).padStart(2, '0')}`, [{ interestId: 'a', goalId: 'network' }], {
        acceptedMeetings: index,
      }),
    );
    const ranked = await rankMatches(me, others, NOW);
    expect(ranked.slice(0, WEIGHTS.topCount).every((m) => m.tier === 'top')).toBe(true);
    expect(ranked.filter((m) => m.tier === 'good')).toHaveLength(2);
    expect(ranked.filter((m) => m.tier === null)).toHaveLength(2);
  });

  it('produces a described top match for the default profile selections', async () => {
    const selections: Selection[] = [
      { interestId: 'group-industry-fintech', goalId: 'get-investment' },
      { interestId: 'group-startup-stage-early-stage-pre-seed-and-seed', goalId: 'get-investment' },
      { interestId: 'group-industry-media', goalId: 'network' },
    ];
    const me: MatchProfile = {
      id: 'me',
      selections,
      text: profileText({
        id: 'me',
        selections,
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
    const ranked = await rankMatches(me, buildOthers(), NOW);
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranked[0].tier).toBe('top');
    expect(ranked[0].score).toBeGreaterThan(0);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
    for (const match of ranked.slice(0, 5)) {
      for (const reason of match.reasons) {
        expect(describeReason(reason, { getInterest, getGoal }).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('overSelectionFactor', () => {
  it('follows the floor, linear and cap rules', () => {
    const total = 100;
    expect(overSelectionFactor(0, total)).toBeCloseTo(WEIGHTS.overSelection.floor);
    expect(overSelectionFactor(20, total)).toBe(1);
    expect(overSelectionFactor(50, total)).toBeCloseTo(0.55);
    expect(overSelectionFactor(80, total)).toBeCloseTo(WEIGHTS.overSelection.floor);
    expect(overSelectionFactor(100, total)).toBeCloseTo(WEIGHTS.overSelection.floor);
  });
});
