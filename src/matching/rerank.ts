import { cosine, type Vector } from '@/matching/embedder';
import { WEIGHTS } from '@/matching/weights';

export type Scored = {
  personId: string;
  p: number;
  text?: Vector;
  role?: string;
  impressions: number;
};

export type Reranked = Scored & { explore?: boolean };

export type RerankOptions = { hidden: Set<string>; seed: number };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function similarity(a: Scored, b: Scored): number {
  if (a.text && b.text) return Math.max(0, cosine(a.text, b.text));
  if (a.role && b.role && a.role === b.role) return 1;
  return 0;
}

export function rerank(scored: Scored[], opts: RerankOptions): Reranked[] {
  const visible: Reranked[] = scored
    .filter((s) => !opts.hidden.has(s.personId))
    .map((s) => ({
      ...s,
      p: s.p * Math.pow(WEIGHTS.fatigueBase, Math.min(s.impressions, WEIGHTS.fatigueCap)),
    }))
    .sort((a, b) => b.p - a.p || a.personId.localeCompare(b.personId));

  const pool = visible.slice(0, WEIGHTS.mmrPool);
  const tail = visible.slice(WEIGHTS.mmrPool).sort((a, b) => b.p - a.p);

  const picked: Reranked[] = [];
  const remaining = [...pool];
  while (remaining.length > 0) {
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let maxSim = 0;
      for (const p of picked) maxSim = Math.max(maxSim, similarity(candidate, p));
      const mmr = WEIGHTS.mmrLambda * candidate.p - (1 - WEIGHTS.mmrLambda) * maxSim;
      if (mmr > bestScore) {
        bestScore = mmr;
        best = i;
      }
    }
    picked.push(remaining[best]);
    remaining.splice(best, 1);
  }

  const ordered = [...picked, ...tail];

  const beyond = ordered.slice(WEIGHTS.topCount);
  if (beyond.length > 0) {
    const rng = mulberry32(opts.seed);
    let chosen = beyond[0];
    for (const candidate of beyond.slice(1)) {
      const chosenDist = Math.abs(chosen.p - 0.5);
      const candidateDist = Math.abs(candidate.p - 0.5);
      if (candidateDist < chosenDist || (candidateDist === chosenDist && rng() < 0.5)) {
        chosen = candidate;
      }
    }
    chosen.explore = true;
    const originalIndex = ordered.indexOf(chosen);
    if (originalIndex >= 0) ordered.splice(originalIndex, 1);
    ordered.splice(Math.min(WEIGHTS.exploreSlot, ordered.length), 0, chosen);
  }

  return ordered;
}
