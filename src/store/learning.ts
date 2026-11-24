import type { MatchingState } from '@/backend/types';
import { listInterests } from '@/data';
import type { Vector } from '@/matching/embedder';
import { applyFeedback, resolveTaste } from '@/matching/feedback';
import { candidateFeatures, matchCorpus } from '@/matching/pipeline';
import { pairScore } from '@/matching/rules';
import type { MatchProfile } from '@/matching/types';
import type { PersonVectors } from '@/matching/vectors';
import type { MatchSignal } from '@/matching/weights';

/** Most recent feedback signals kept in the matching state. */
export const FEEDBACK_LIMIT = 200;

export type LearnInput = {
  me: MatchProfile;
  them: MatchProfile;
  /** The same candidate list recommend() ranks, so the features match what was ranked. */
  others: MatchProfile[];
  vectors: Record<string, PersonVectors>;
  embedderId: string;
  personId: string;
  signal: MatchSignal;
  now: Date;
};

/** The feature vector for one pair, scored against the full candidate corpus like recommend(). */
export function pairFeatures(
  input: Pick<LearnInput, 'me' | 'them' | 'others' | 'vectors' | 'now'>,
  taste: Vector | undefined,
): number[] {
  const { me, them, others, vectors, now } = input;
  const rule = pairScore(me, them, matchCorpus(me, others), listInterests().length, now);
  return candidateFeatures({
    me,
    them,
    meVec: vectors[me.id],
    themVec: vectors[them.id],
    taste,
    ruleScore: rule.score,
    now,
  });
}

/** Apply one feedback signal to the matching state it is given (the current one, not a snapshot). */
export function learnFromSignal(matching: MatchingState, input: LearnInput): MatchingState {
  const taste = resolveTaste(matching.embedderId, input.embedderId, matching.taste);
  const x = pairFeatures(input, taste);
  const next = applyFeedback(
    { ranker: matching.ranker, taste },
    x,
    input.vectors[input.them.id].text,
    input.signal,
  );
  return {
    ...matching,
    ranker: next.ranker,
    taste: next.taste ? Array.from(next.taste) : undefined,
    embedderId: input.embedderId,
    feedback: [
      { personId: input.personId, signal: input.signal, at: input.now.toISOString() },
      ...matching.feedback,
    ].slice(0, FEEDBACK_LIMIT),
  };
}

/**
 * Build the learning update for one signal. Resolves to an updater for the then-current matching
 * state, or null when building vectors failed or the owner changed during the await. Never rejects.
 */
export async function prepareLearning(args: {
  owner: LearningOwner;
  currentOwner: () => LearningOwner;
  buildVectors: () => Promise<Record<string, PersonVectors>>;
  input: Omit<LearnInput, 'vectors' | 'now'>;
}): Promise<((matching: MatchingState) => MatchingState) | null> {
  try {
    const vectors = await args.buildVectors();
    if (!isSameOwner(args.owner, args.currentOwner())) return null;
    const input: LearnInput = { ...args.input, vectors, now: new Date() };
    return (matching) => learnFromSignal(matching, input);
  } catch {
    return null;
  }
}

export type LearningOwner = { accountId: string | null; generation: number };

/**
 * A learning result computed after an await is written only when the same signed-in account
 * is current and no reset (or account switch) bumped the generation meanwhile.
 */
export function isSameOwner(started: LearningOwner, current: LearningOwner): boolean {
  return (
    started.accountId !== null &&
    started.accountId === current.accountId &&
    started.generation === current.generation
  );
}
