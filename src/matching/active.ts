import { getGoal, listPeople } from '@/data';
import { lexicalEmbedder, type Embedder, type Vector } from '@/matching/embedder';
import { profileText } from '@/matching/inputs';
import type { MatchProfile } from '@/matching/types';
import { buildInterestVectors, buildVectors, interestLabels, type PersonVectors } from '@/matching/vectors';
import { hashString } from '@/lib/utils';

let current: Embedder | null = null;

const interestCache = new Map<string, Promise<Record<string, Vector>>>();
const textCache = new Map<string, Promise<Vector>>();

const listeners: (() => void)[] = [];

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function setEmbedder(embedder: Embedder): void {
  current = embedder;
  interestCache.clear();
  textCache.clear();
  notify();
}

function defaultCorpus(): string[] {
  const labels = interestLabels();
  return [...listPeople().map(profileText), ...labels.map((l) => l.label)];
}

export function getEmbedder(): Embedder {
  if (!current) current = lexicalEmbedder(defaultCorpus());
  return current;
}

function profileHash(profile: MatchProfile): string {
  const selections = profile.selections
    .map((s) => [s.interestId, s.goalId])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  return String(hashString(JSON.stringify([profile.text, selections])));
}

/** Interest label vectors for this embedder, built once and cached until the embedder changes. */
export function interestVectors(embedder: Embedder): Promise<Record<string, Vector>> {
  let promise = interestCache.get(embedder.id);
  if (!promise) {
    promise = buildInterestVectors(embedder);
    interestCache.set(embedder.id, promise);
  }
  return promise;
}

function textVector(embedder: Embedder, profile: MatchProfile): Promise<Vector> {
  const key = `${embedder.id}:${profile.id}:${profileHash(profile)}`;
  let promise = textCache.get(key);
  if (!promise) {
    promise = embedder.embed([profile.text]).then((vecs) => vecs[0]);
    textCache.set(key, promise);
  }
  return promise;
}

export async function vectorsFor(
  embedder: Embedder,
  profiles: MatchProfile[],
): Promise<Record<string, PersonVectors>> {
  const [interestVec, textVecs] = await Promise.all([
    interestVectors(embedder),
    Promise.all(profiles.map((p) => textVector(embedder, p))),
  ]);
  const out: Record<string, PersonVectors> = {};
  profiles.forEach((p, i) => {
    out[p.id] = buildVectors(p, { interestVec, textVec: textVecs[i], goals: getGoal });
  });
  return out;
}
