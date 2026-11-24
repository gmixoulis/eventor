import { describe, expect, it } from '@jest/globals';

import { describeReason, shortReason } from '@/matching/describe';
import { goals as seedGoals } from '@/data/seed';
import type { ReasonLookups } from '@/matching/types';

const interests: Record<string, string> = { travel: 'Travel', seed: 'Early Stage (Pre-Seed and Seed)', ai: 'AI' };
const goals: Record<string, string> = { invest: 'Invest in this', raise: 'Raise for this' };
const lookups: ReasonLookups = {
  getInterest: (id) => (id in interests ? { name: interests[id] } : undefined),
  getGoal: (id) => (id in goals ? { label: goals[id] } : undefined),
};

describe('shortReason', () => {
  it('says a same-interest match once instead of twice', () => {
    const reason = { kind: 'related' as const, myInterestId: 'seed', theirInterestId: 'seed' };
    expect(shortReason(reason, lookups)).toBe('Both into Early Stage (Pre-Seed and Seed)');
    expect(describeReason(reason, lookups).length).toBeGreaterThan(shortReason(reason, lookups).length);
  });
  it('joins two related interests and counts extra networking areas', () => {
    expect(shortReason({ kind: 'related', myInterestId: 'ai', theirInterestId: 'travel' }, lookups)).toBe('AI meets Travel');
    expect(shortReason({ kind: 'networking', interestIds: ['travel'] }, lookups)).toBe('Both network about Travel');
    expect(shortReason({ kind: 'networking', interestIds: ['travel', 'ai', 'seed'] }, lookups)).toBe('Both network about Travel +2');
  });
  it('covers every other kind with a short fixed line', () => {
    expect(shortReason({ kind: 'complementary', interestId: 'ai', myGoalId: 'raise', theirGoalId: 'invest' }, lookups)).toBe('Goals that fit in AI');
    expect(shortReason({ kind: 'text', terms: ['logistics', 'retail'] }, lookups)).toBe('Similar focus: logistics');
    expect(shortReason({ kind: 'text', terms: [] }, lookups)).toBe('Similar work');
    expect(shortReason({ kind: 'taste' }, lookups)).toBe('Like people you connected with');
    expect(shortReason({ kind: 'explore' }, lookups)).toBe('Something different');
    expect(shortReason({ kind: 'slot' }, lookups)).toBe('Free at the same time');
  });
});

describe('describeReason', () => {
  it('says a same-interest match once and keeps the close-to sentence for different ones', () => {
    expect(describeReason({ kind: 'related', myInterestId: 'seed', theirInterestId: 'seed' }, lookups)).toBe(
      'You are both interested in Early Stage (Pre-Seed and Seed).',
    );
    expect(describeReason({ kind: 'related', myInterestId: 'ai', theirInterestId: 'travel' }, lookups)).toBe(
      'Your interest in AI is close to their interest in Travel.',
    );
  });
  it('joins 1, 2 and 3 networking interests naturally', () => {
    const net = (interestIds: string[]) => describeReason({ kind: 'networking', interestIds }, lookups);
    expect(net(['ai'])).toBe('You both network about AI.');
    expect(net(['ai', 'travel'])).toBe('You both network about AI and Travel.');
    expect(net(['ai', 'travel', 'seed'])).toBe('You both network about AI, Travel and Early Stage (Pre-Seed and Seed).');
  });
  it('joins text terms naturally', () => {
    expect(describeReason({ kind: 'text', terms: ['logistics'] }, lookups)).toBe('Similar focus: logistics.');
    expect(describeReason({ kind: 'text', terms: ['logistics', 'retail'] }, lookups)).toBe('Similar focus: logistics and retail.');
    expect(describeReason({ kind: 'text', terms: ['a', 'b', 'c'] }, lookups)).toBe('Similar focus: a, b and c.');
  });
  it('builds a complementary sentence without a doubled "want to"', () => {
    const reason = { kind: 'complementary' as const, interestId: 'ai', myGoalId: 'raise', theirGoalId: 'invest' };
    expect(describeReason(reason, lookups)).toBe('You want to raise for AI and they want to invest in AI.');
    const withWant = { getInterest: lookups.getInterest, getGoal: () => ({ label: 'Want to invest in this' }) };
    expect(describeReason(reason, withWant)).toBe('You want to invest in AI and they want to invest in AI.');
  });
  it('drops repeated text terms, case-insensitive, keeping the first spelling', () => {
    expect(describeReason({ kind: 'text', terms: ['Retail', 'logistics', 'retail', 'LOGISTICS'] }, lookups)).toBe(
      'Similar focus: Retail and logistics.',
    );
  });
  it('names the interest on both sides for every real goal pair', () => {
    const byId = new Map(seedGoals.map((g) => [g.id, g.label]));
    const real: ReasonLookups = {
      getInterest: () => ({ name: 'Fintech' }),
      getGoal: (id) => ({ label: byId.get(id) ?? '' }),
    };
    for (const g of seedGoals) {
      const sentence = describeReason({ kind: 'complementary', interestId: 'x', myGoalId: g.id, theirGoalId: g.pairsWith }, real);
      expect(sentence.split('Fintech').length - 1).toBe(2);
      expect(sentence).not.toContain('want to want to');
    }
  });
});
