import { cosine, normalize, zeros, type Vector } from '@/matching/embedder';
import type { MatchProfile } from '@/matching/types';
import { unknownInterestVector, type PersonVectors } from '@/matching/vectors';
import { WEIGHTS } from '@/matching/weights';

export type SponsorInput = {
  id: string;
  description: string;
  interestIds: string[];
};

export type SponsorScore = {
  sponsorId: string;
  score: number;
  reasons: string[];
};

const BLOCKS = 5;

/**
 * A sponsor has interests but no goals, so its interest vector spans every
 * block: the same interest then matches whether the account seeks it, offers
 * it, or networks in it.
 */
export function buildSponsorVector(
  interestIds: string[],
  interestVec: Record<string, Vector>,
  dim: number,
): Vector {
  const out = zeros(dim * BLOCKS);
  for (const interestId of interestIds) {
    const vec = interestVec[interestId] ?? unknownInterestVector(interestId, dim);
    for (let block = 0; block < BLOCKS; block++) {
      for (let i = 0; i < dim; i++) out[block * dim + i] += vec[i];
    }
  }
  return normalize(out);
}

function interestSimilarity(meVec: PersonVectors, sponsorVec: Vector): number {
  return Math.max(
    cosine(meVec.seeks, sponsorVec),
    cosine(meVec.offers, sponsorVec),
    cosine(meVec.network, sponsorVec),
  );
}

export function scoreSponsors(opts: {
  me: MatchProfile;
  meVec: PersonVectors;
  sponsors: SponsorInput[];
  interestVec: Record<string, Vector>;
  sponsorText: Vector[];
  interestName: (id: string) => string | undefined;
}): SponsorScore[] {
  const dim = opts.meVec.seeks.length / BLOCKS;
  const selected = new Set(opts.me.selections.map((selection) => selection.interestId));
  const out: SponsorScore[] = opts.sponsors.map((sponsor, index) => {
    const sponsorVec = buildSponsorVector(sponsor.interestIds, opts.interestVec, dim);
    const interest = interestSimilarity(opts.meVec, sponsorVec);
    const text =
      opts.meVec.text && opts.sponsorText[index]
        ? Math.max(0, cosine(opts.meVec.text, opts.sponsorText[index]))
        : 0;
    const reasons = sponsor.interestIds
      .filter((interestId) => selected.has(interestId))
      .slice(0, 3)
      .map((interestId) => `Matches your interest in ${opts.interestName(interestId) ?? interestId}`);
    if (reasons.length === 0) {
      reasons.push(
        text >= WEIGHTS.text.soloThreshold ? 'Similar focus to your profile' : 'Matches your profile',
      );
    }
    return { sponsorId: sponsor.id, score: interest + WEIGHTS.text.maxBoost * text, reasons };
  });
  return out.sort((a, b) => b.score - a.score);
}
