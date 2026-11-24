import { listInterestGroups, listInterests } from '@/data';
import { type Embedder, type Vector, zeros, normalize } from '@/matching/embedder';
import type { MatchProfile, Selection } from '@/matching/types';
import { hashString } from '@/lib/utils';

export type PersonVectors = {
  seeks: Vector;
  offers: Vector;
  network: Vector;
  text?: Vector;
};

export type GoalLookup = (goalId: string) => { intentId: string } | undefined;

export type BuildContext = {
  interestVec: Record<string, Vector>;
  textVec: Vector | undefined;
  goals: GoalLookup;
};

const INTENT_BLOCKS = ['trading', 'investment', 'recruitment', 'mentoring'] as const;
const NETWORK_BLOCK = INTENT_BLOCKS.length;
const SEEK_GOALS = new Set(['buy', 'get-investment', 'get-job', 'find-mentor']);

// Fallback for interest ids that have no embedded vector (for example synthetic
// test ids). A deterministic one-hot keeps the same id mapping to the same
// vector, so identity matching still works.
export function unknownInterestVector(id: string, dim: number): Vector {
  const vec = zeros(dim);
  if (dim > 0) vec[hashString(id) % dim] = 1;
  return vec;
}

function categoryName(categoryId: string): string {
  return listInterestGroups().find((g) => g.id === categoryId)?.name ?? categoryId;
}

export function interestLabels(): { id: string; label: string }[] {
  return listInterests().map((interest) => ({
    id: interest.id,
    label: `${categoryName(interest.categoryId)}: ${interest.name}`,
  }));
}

export async function buildInterestVectors(embedder: Embedder): Promise<Record<string, Vector>> {
  const labels = interestLabels();
  const vecs = await embedder.embed(labels.map((l) => l.label));
  const out: Record<string, Vector> = {};
  labels.forEach((l, i) => {
    out[l.id] = vecs[i];
  });
  return out;
}

function interestDimension(ctx: BuildContext): number {
  if (ctx.textVec && ctx.textVec.length > 0) return ctx.textVec.length;
  for (const v of Object.values(ctx.interestVec)) {
    if (v.length > 0) return v.length;
  }
  return 0;
}

function blockFor(selection: Selection, goals: GoalLookup): number {
  if (selection.goalId === 'network') return NETWORK_BLOCK;
  const intentId = goals(selection.goalId)?.intentId;
  const block = INTENT_BLOCKS.indexOf(intentId as (typeof INTENT_BLOCKS)[number]);
  return block >= 0 ? block : 0;
}

function sideFor(goalId: string): 'seeks' | 'offers' | 'network' {
  if (goalId === 'network') return 'network';
  return SEEK_GOALS.has(goalId) ? 'seeks' : 'offers';
}

export function buildVectors(profile: MatchProfile, ctx: BuildContext): PersonVectors {
  const dim = interestDimension(ctx);
  const total = dim * (NETWORK_BLOCK + 1);
  const seeks = zeros(total);
  const offers = zeros(total);
  const network = zeros(total);

  for (const selection of profile.selections) {
    if (dim === 0) break;
    const side = sideFor(selection.goalId);
    const vec = ctx.interestVec[selection.interestId] ?? unknownInterestVector(selection.interestId, dim);
    const target = side === 'seeks' ? seeks : side === 'offers' ? offers : network;
    const offset = blockFor(selection, ctx.goals) * dim;
    for (let i = 0; i < dim; i++) target[offset + i] += vec[i];
  }

  return {
    seeks: normalize(seeks),
    offers: normalize(offers),
    network: normalize(network),
    text: ctx.textVec,
  };
}
