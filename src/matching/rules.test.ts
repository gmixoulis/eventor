import { describe, expect, it } from '@jest/globals';

import { isRecent, medianOf, overSelectionFactor, pairScore } from '@/matching/rules';
import type { MatchProfile, Selection } from '@/matching/types';
import { WEIGHTS } from '@/matching/weights';

const NOW = new Date('2026-05-27T12:00:00Z');
const FINTECH = 'group-industry-fintech';
const LEGALTECH = 'group-industry-legaltech';
const MEDIA = 'group-industry-media';

function profile(selections: Selection[], over: Partial<MatchProfile> = {}): MatchProfile {
  return {
    id: 'p',
    selections,
    text: '',
    industry: '',
    acceptedMeetings: 0,
    staleRequests: 0,
    freeSlotRatio: 1,
    ...over,
  };
}

const sel = (interestId: string, goalId: string): Selection => ({ interestId, goalId });
const score = (me: MatchProfile, them: MatchProfile, total = 100) =>
  pairScore(me, them, [], total, NOW);

describe('overSelectionFactor', () => {
  const { floor, start, end } = WEIGHTS.overSelection;

  it('returns the floor when nothing is selected', () => {
    expect(overSelectionFactor(0, 10)).toBe(floor);
    expect(overSelectionFactor(-1, 10)).toBe(floor);
  });

  it('returns 1 when the total is not positive', () => {
    expect(overSelectionFactor(3, 0)).toBe(1);
  });

  it('is 1 up to the start ratio and the floor from the end ratio', () => {
    expect(overSelectionFactor(start * 100, 100)).toBe(1);
    expect(overSelectionFactor(end * 100, 100)).toBe(floor);
    expect(overSelectionFactor(100, 100)).toBe(floor);
  });

  it('interpolates linearly in between', () => {
    expect(overSelectionFactor(50, 100)).toBeCloseTo((1 + floor) / 2);
  });
});

describe('isRecent', () => {
  it('accepts a date inside the window and rejects one outside', () => {
    expect(isRecent('2026-05-23T12:00:00Z', NOW)).toBe(true);
    expect(isRecent('2026-05-22T11:59:00Z', NOW)).toBe(false);
  });

  it('treats the exact boundary as recent', () => {
    expect(isRecent('2026-05-22T12:00:00Z', NOW)).toBe(true);
  });

  it('rejects an unparseable date', () => {
    expect(isRecent('not a date', NOW)).toBe(false);
  });
});

describe('medianOf', () => {
  it('handles odd and even lengths without mutating the input', () => {
    const input = [3, 1, 2];
    expect(medianOf(input)).toBe(2);
    expect(input).toEqual([3, 1, 2]);
    expect(medianOf([4, 1, 3, 2])).toBe(2.5);
  });

  it('returns the single value', () => {
    expect(medianOf([7])).toBe(7);
  });
});

describe('pairScore', () => {
  it('scores a complementary goal pair on a shared interest', () => {
    const me = profile([sel(FINTECH, 'get-investment')]);
    const them = profile([sel(FINTECH, 'invest')]);
    const result = score(me, them);
    expect(result.score).toBeCloseTo(WEIGHTS.complementary);
    expect(result.reasons).toEqual([
      { kind: 'complementary', interestId: FINTECH, myGoalId: 'get-investment', theirGoalId: 'invest' },
    ]);
  });

  it('scores two networkers and groups them in one reason', () => {
    const me = profile([sel(FINTECH, 'network'), sel(MEDIA, 'network')]);
    const them = profile([sel(FINTECH, 'network'), sel(MEDIA, 'network')]);
    const result = score(me, them);
    expect(result.score).toBeCloseTo(2 * WEIGHTS.bothNetworking);
    expect(result.reasons).toEqual([{ kind: 'networking', interestIds: [FINTECH, MEDIA] }]);
  });

  it('never treats network with network as complementary', () => {
    const result = score(profile([sel(FINTECH, 'network')]), profile([sel(FINTECH, 'network')]));
    expect(result.reasons.some((r) => r.kind === 'complementary')).toBe(false);
  });

  it('gives sameGoal points without a reason for a non-complementary overlap', () => {
    const result = score(profile([sel(FINTECH, 'invest')]), profile([sel(FINTECH, 'invest')]));
    expect(result.score).toBeCloseTo(WEIGHTS.sameGoal);
    expect(result.reasons).toEqual([]);
  });

  it('scores related interests, higher when the goals are complementary', () => {
    const plain = score(profile([sel(FINTECH, 'network')]), profile([sel(LEGALTECH, 'network')]));
    expect(plain.score).toBeCloseTo(WEIGHTS.related);
    expect(plain.reasons).toEqual([
      { kind: 'related', myInterestId: FINTECH, theirInterestId: LEGALTECH },
    ]);
    const comp = score(
      profile([sel(FINTECH, 'get-investment')]),
      profile([sel(LEGALTECH, 'invest')]),
    );
    expect(comp.score).toBeCloseTo(WEIGHTS.relatedComplementary);
  });

  it('scores zero with no overlap and no text', () => {
    const result = score(profile([sel(FINTECH, 'invest')]), profile([sel(MEDIA, 'invest')]));
    expect(result).toEqual({ score: 0, reasons: [] });
  });

  it('applies the over-selection penalty to both sides', () => {
    const me = profile([sel(FINTECH, 'get-investment')]);
    const them = profile([sel(FINTECH, 'invest')]);
    // total 1 makes a single selection a ratio of 1, which hits the floor on each side.
    expect(score(me, them, 1).score).toBeCloseTo(
      WEIGHTS.complementary * WEIGHTS.overSelection.floor ** 2,
    );
  });

  it('applies industry, recency, meeting, stale and free-slot multipliers', () => {
    const me = profile([sel(FINTECH, 'get-investment')], { industry: 'Fin' });
    const them = profile([sel(FINTECH, 'invest')], {
      industry: 'Fin',
      lastActiveAt: '2026-05-27T00:00:00Z',
      acceptedMeetings: 3,
      staleRequests: 1,
      freeSlotRatio: 0.05,
    });
    const expected =
      WEIGHTS.complementary *
      WEIGHTS.sameIndustry *
      WEIGHTS.recentActivity *
      (1 + WEIGHTS.acceptedMeetingStep * 3) *
      WEIGHTS.staleRequest *
      WEIGHTS.lowFreeSlots.factor;
    expect(score(me, them).score).toBeCloseTo(expected);
  });

  it('caps the accepted-meetings boost', () => {
    const me = profile([sel(FINTECH, 'get-investment')]);
    const them = profile([sel(FINTECH, 'invest')], { acceptedMeetings: 1000 });
    expect(score(me, them).score).toBeCloseTo(WEIGHTS.complementary * WEIGHTS.acceptedMeetingCap);
  });

  it('does not apply the industry bonus when either industry is empty', () => {
    const me = profile([sel(FINTECH, 'get-investment')], { industry: 'Fin' });
    const them = profile([sel(FINTECH, 'invest')], { industry: '' });
    expect(score(me, them).score).toBeCloseTo(WEIGHTS.complementary);
  });

  it('scores on text alone above the solo threshold and reports the terms', () => {
    const text = 'quantum robotics laboratory';
    const result = score(profile([], { text }), profile([], { text }));
    expect(result.score).toBeCloseTo(WEIGHTS.text.soloPoints, 5);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].kind).toBe('text');
  });

  it('boosts an interest score by text similarity', () => {
    const text = 'quantum robotics laboratory';
    const me = profile([sel(FINTECH, 'get-investment')], { text });
    const them = profile([sel(FINTECH, 'invest')], { text });
    expect(score(me, them).score).toBeCloseTo(
      WEIGHTS.complementary * (1 + WEIGHTS.text.maxBoost),
      5,
    );
  });
});
