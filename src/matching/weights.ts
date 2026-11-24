// All tunable numbers for the matchmaking engine live here.

export const WEIGHTS = {
  // Phase 1 rule scoring (kept as features).
  complementary: 10,
  bothNetworking: 6,
  sameGoal: 2,
  relatedComplementary: 3,
  related: 2,
  overSelection: { start: 0.2, end: 0.8, floor: 0.1 },
  text: { maxBoost: 0.3, soloThreshold: 0.35, soloPoints: 6 },
  sameIndustry: 1.1,
  recentDays: 5,
  recentActivity: 1.1,
  acceptedMeetingStep: 0.02,
  acceptedMeetingCap: 1.1,
  staleRequest: 0.9,
  lowFreeSlots: { below: 0.1, factor: 0.85 },
  topCount: 10,

  // Phase 1b reciprocal score.
  oneSided: 0.5,

  // Feature squashing.
  ruleScoreHalf: 20,

  // Ranker.
  learningRate: 0.3,
  priorPull: 0.01,
  weightClamp: 5,

  // Taste vector.
  tasteRate: 0.1,

  // Re-ranker.
  fatigueBase: 0.9,
  fatigueCap: 5,
  mmrPool: 30,
  mmrLambda: 0.7,
  exploreSlot: 4,

  // Lexical embedder.
  vocabCap: 512,
} as const;

// Feature order is fixed: bias, complementary, networking, text, taste,
// sameIndustry, recent, responsive, freeSlots, slotOverlap, overSelection,
// ruleScore. Prior weights reproduce phase 1 ordering: complementary first,
// then networking, then ruleScore, text, taste, with small positives for the
// rest and a negative bias so an empty candidate scores under 0.5.
export const PRIOR_WEIGHTS: number[] = [
  -2.5, // bias
  6.0, // complementary
  1.5, // networking
  0.8, // text
  0.6, // taste
  0.2, // sameIndustry
  0.15, // recent
  0.1, // responsive
  0.1, // freeSlots
  0.1, // slotOverlap
  0.1, // overSelection
  1.0, // ruleScore
];

export type MatchSignal =
  | 'request_sent'
  | 'request_accepted'
  | 'bookmark'
  | 'chat_opened'
  | 'profile_viewed'
  | 'hide'
  | 'request_declined'
  | 'impression_ignored';

export const SIGNALS: Record<MatchSignal, { label: 0 | 1; strength: number }> = {
  request_sent: { label: 1, strength: 1.0 },
  request_accepted: { label: 1, strength: 1.0 },
  bookmark: { label: 1, strength: 0.7 },
  chat_opened: { label: 1, strength: 0.5 },
  profile_viewed: { label: 1, strength: 0.2 },
  hide: { label: 0, strength: 1.0 },
  request_declined: { label: 0, strength: 0.6 },
  impression_ignored: { label: 0, strength: 0.1 },
};
