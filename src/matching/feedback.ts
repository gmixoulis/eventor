import type { Vector } from '@/matching/embedder';
import { update, type RankerState } from '@/matching/ranker';
import { updateTaste } from '@/matching/taste';
import { SIGNALS, type MatchSignal } from '@/matching/weights';

export function resolveTaste(
  storedEmbedderId: string,
  activeEmbedderId: string,
  taste: Vector | undefined,
): Vector | undefined {
  return storedEmbedderId === activeEmbedderId ? taste : undefined;
}

export function applyFeedback(
  state: { ranker: RankerState; taste: Vector | undefined },
  x: number[],
  candidateText: Vector | undefined,
  signal: MatchSignal,
): { ranker: RankerState; taste: Vector | undefined } {
  const { label, strength } = SIGNALS[signal];
  const ranker = update(state.ranker, x, label, strength);
  const taste = candidateText
    ? updateTaste(state.taste, candidateText, label, strength)
    : state.taste;
  return { ranker, taste };
}
