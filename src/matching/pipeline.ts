import { listInterests } from '@/data';
import { cosine, type Vector } from '@/matching/embedder';
import { FEATURE_NAMES, predict, type RankerState } from '@/matching/ranker';
import { reciprocal } from '@/matching/reciprocal';
import { rerank, type Reranked } from '@/matching/rerank';
import { isRecent, medianOf, overSelectionFactor, pairScore } from '@/matching/rules';
import type { Match, MatchProfile, MatchReason } from '@/matching/types';
import type { PersonVectors } from '@/matching/vectors';
import { WEIGHTS } from '@/matching/weights';

export type RecommendInput = {
  me: MatchProfile;
  others: MatchProfile[];
  vectors: Record<string, PersonVectors>;
  ranker: RankerState;
  taste?: Vector;
  impressions?: Record<string, number>;
  hidden?: string[];
  now: Date;
  embedderId?: string;
};

const REASON_INDICES = {
  complementary: FEATURE_NAMES.indexOf('complementary'),
  networking: FEATURE_NAMES.indexOf('networking'),
  text: FEATURE_NAMES.indexOf('text'),
  taste: FEATURE_NAMES.indexOf('taste'),
  slotOverlap: FEATURE_NAMES.indexOf('slotOverlap'),
};

function hourOf(slot: string): string {
  return slot.slice(0, 13);
}

function slotOverlap(a?: string[], b?: string[]): number {
  if (!a?.length || !b?.length) return 0.5;
  const bHours = new Set(b.map(hourOf));
  return a.some((slot) => bHours.has(hourOf(slot))) ? 1 : 0;
}

export function candidateFeatures(opts: {
  me: MatchProfile;
  them: MatchProfile;
  meVec: PersonVectors;
  themVec: PersonVectors;
  taste?: Vector;
  ruleScore: number;
  now: Date;
}): number[] {
  const { me, them, meVec, themVec } = opts;
  const recip = reciprocal(meVec, themVec);
  const taste =
    opts.taste && themVec.text ? Math.max(0, cosine(opts.taste, themVec.text)) : 0;
  const sameIndustry =
    me.industry && them.industry && me.industry === them.industry ? 1 : 0;
  const recent = them.lastActiveAt && isRecent(them.lastActiveAt, opts.now) ? 1 : 0;
  const responsive = 1 - Math.min(1, them.staleRequests);
  const ruleScore = opts.ruleScore / (opts.ruleScore + WEIGHTS.ruleScoreHalf);
  return [
    1, // bias
    recip.complementary,
    recip.networking,
    recip.text,
    taste,
    sameIndustry,
    recent,
    responsive,
    them.freeSlotRatio,
    slotOverlap(me.availability, them.availability),
    overSelectionFactor(them.selections.length, listInterests().length),
    ruleScore,
  ];
}

type Candidate = Reranked & {
  x: number[];
  rule: { score: number; reasons: MatchReason[] };
};

function textReason(rule: Candidate['rule'], embedderId: string): MatchReason | undefined {
  if (embedderId === 'lexical') {
    const text = rule.reasons.find((r) => r.kind === 'text');
    return text && text.kind === 'text' && text.terms.length > 0 ? text : undefined;
  }
  return { kind: 'text', terms: [] };
}

function buildReasons(opts: {
  x: number[];
  ranker: RankerState;
  rule: Candidate['rule'];
  explore?: boolean;
  embedderId: string;
}): MatchReason[] {
  const { x, ranker, rule, explore, embedderId } = opts;
  const contribution = (index: number) => ranker.weights[index] * x[index];

  const groups: { contribution: number; reasons: MatchReason[] }[] = [];

  const interestReasons = rule.reasons.filter(
    (r) => r.kind === 'complementary' || r.kind === 'related',
  );
  if (x[REASON_INDICES.complementary] > 0 && interestReasons.length > 0) {
    groups.push({ contribution: contribution(REASON_INDICES.complementary), reasons: interestReasons });
  }

  const networkingReasons = rule.reasons.filter((r) => r.kind === 'networking');
  if (x[REASON_INDICES.networking] > 0 && networkingReasons.length > 0) {
    groups.push({ contribution: contribution(REASON_INDICES.networking), reasons: networkingReasons });
  }

  if (x[REASON_INDICES.text] > 0) {
    const reason = textReason(rule, embedderId);
    if (reason) groups.push({ contribution: contribution(REASON_INDICES.text), reasons: [reason] });
  }

  if (x[REASON_INDICES.taste] > 0) {
    groups.push({ contribution: contribution(REASON_INDICES.taste), reasons: [{ kind: 'taste' }] });
  }

  if (x[REASON_INDICES.slotOverlap] >= 1) {
    groups.push({ contribution: contribution(REASON_INDICES.slotOverlap), reasons: [{ kind: 'slot' }] });
  }

  groups.sort((a, b) => b.contribution - a.contribution);

  const reasons: MatchReason[] = [];
  if (explore) reasons.push({ kind: 'explore' });
  for (const group of groups) {
    for (const reason of group.reasons) {
      if (reasons.length >= 4) break;
      reasons.push(reason);
    }
    if (reasons.length >= 4) break;
  }
  return reasons;
}

function dayNumber(now: Date): number {
  return Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
}

function toMatch(
  candidate: Candidate,
  ranker: RankerState,
  embedderId: string,
): Match {
  return {
    personId: candidate.personId,
    p: candidate.p,
    score: candidate.p * 100,
    tier: null,
    reasons: buildReasons({
      x: candidate.x,
      ranker,
      rule: candidate.rule,
      explore: candidate.explore,
      embedderId,
    }),
    explore: candidate.explore,
  };
}

/** The text corpus pair scores are computed against; ranking and learning must share it. */
export function matchCorpus(me: MatchProfile, others: MatchProfile[]): string[] {
  return [me.text, ...others.map((other) => other.text)];
}

export function recommend(input: RecommendInput): Match[] {
  const {
    me,
    others,
    vectors,
    ranker,
    taste,
    impressions = {},
    hidden = [],
    now,
    embedderId = 'lexical',
  } = input;
  const meVec = vectors[me.id];
  const corpus = matchCorpus(me, others);
  const total = listInterests().length;

  const candidates: Candidate[] = [];
  for (const other of others) {
    const themVec = vectors[other.id];
    const recip = reciprocal(meVec, themVec);
    const rule = pairScore(me, other, corpus, total, now);
    if (recip.complementary <= 0 && recip.networking <= 0 && recip.text <= 0 && rule.score <= 0) {
      continue;
    }
    const x = candidateFeatures({ me, them: other, meVec, themVec, taste, ruleScore: rule.score, now });
    candidates.push({
      personId: other.id,
      p: predict(ranker, x),
      text: themVec.text,
      role: other.role,
      impressions: impressions[other.id] ?? 0,
      x,
      rule,
    });
  }

  const reranked = rerank(candidates, { hidden: new Set(hidden), seed: dayNumber(now) });

  const byId = new Map(candidates.map((candidate) => [candidate.personId, candidate]));
  const matches = reranked.map((r) => {
    const base = byId.get(r.personId);
    if (!base) return null;
    return toMatch({ ...base, p: r.p, explore: r.explore }, ranker, embedderId);
  });

  const nonNull = matches.filter((m) => m !== null);

  const rest = nonNull.slice(WEIGHTS.topCount);
  const median = rest.length > 0 ? medianOf(rest.map((m) => m.p)) : 0;

  return nonNull.map((match, index) => {
    let tier: Match['tier'] = null;
    if (index < WEIGHTS.topCount) tier = 'top';
    else if (match.p > median) tier = 'good';
    return { ...match, tier };
  });
}
