import { PRIOR_WEIGHTS, WEIGHTS } from '@/matching/weights';

export type RankerState = { weights: number[]; updates: number };

export const FEATURE_NAMES = [
  'bias',
  'complementary',
  'networking',
  'text',
  'taste',
  'sameIndustry',
  'recent',
  'responsive',
  'freeSlots',
  'slotOverlap',
  'overSelection',
  'ruleScore',
] as const;

export function priorState(): RankerState {
  return { weights: [...PRIOR_WEIGHTS], updates: 0 };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function predict(state: RankerState, x: number[]): number {
  return sigmoid(dot(state.weights, x));
}

export function update(
  state: RankerState,
  x: number[],
  label: 0 | 1,
  strength: number,
): RankerState {
  const p = predict(state, x);
  const lr = WEIGHTS.learningRate * strength;
  const weights = state.weights.map((w, j) => {
    const gradient = (p - label) * x[j];
    const pull = WEIGHTS.priorPull * (w - PRIOR_WEIGHTS[j]);
    return clamp(w - lr * (gradient + pull), -WEIGHTS.weightClamp, WEIGHTS.weightClamp);
  });
  return { weights, updates: state.updates + 1 };
}
