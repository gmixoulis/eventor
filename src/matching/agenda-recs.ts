import { getInterest } from '@/data';
import type { AgendaItem } from '@/lib/agenda-item';
import { interestVectors } from '@/matching/active';
import { cosine, normalize, type Embedder, type Vector } from '@/matching/embedder';
import { unknownInterestVector } from '@/matching/vectors';
import { WEIGHTS } from '@/matching/weights';

export type AgendaRecInput = {
  item: AgendaItem;
  text: string;
  interestIds: string[];
};

export type AgendaRec = {
  key: string;
  score: number;
  /** Null when nothing specific matched; the row then shows no reason. */
  reason: string | null;
};

/** The normalized sum of the interests' label vectors (empty interests give a zero vector). */
function interestSum(ids: string[], interestVec: Record<string, Vector>, dim: number): Vector {
  const out = new Float32Array(dim);
  for (const id of ids) {
    const vec = interestVec[id] ?? unknownInterestVector(id, dim);
    for (let i = 0; i < dim; i++) out[i] += vec[i];
  }
  return normalize(out);
}

/**
 * Rank agenda items for a profile with the same embedder access as sponsors: cached interest
 * label vectors for the interest overlap, plus a capped text similarity boost.
 */
export async function recommendAgenda(
  profileText: string,
  selectionInterestIds: string[],
  items: AgendaRecInput[],
  embed: Embedder,
): Promise<AgendaRec[]> {
  const [interestVec, textVecs] = await Promise.all([
    interestVectors(embed),
    embed.embed([profileText, ...items.map((candidate) => candidate.text)]),
  ]);
  const meText = textVecs[0];
  const dim = meText.length;
  const meInterest = interestSum(selectionInterestIds, interestVec, dim);
  const selected = new Set(selectionInterestIds);

  const scored = items.map((candidate, index) => {
    const interest = cosine(meInterest, interestSum(candidate.interestIds, interestVec, dim));
    const text = Math.max(0, cosine(meText, textVecs[index + 1]));
    const shared = candidate.interestIds.find((id) => selected.has(id));
    const reason =
      shared !== undefined
        ? `Matches your interest in ${getInterest(shared)?.name ?? shared}`
        : text >= WEIGHTS.text.soloThreshold
          ? 'Similar focus to your profile'
          : null;
    return { key: candidate.item.key, score: interest + WEIGHTS.text.maxBoost * text, reason };
  });
  return scored.sort((a, b) => b.score - a.score);
}
