import { add, normalize, scale, type Vector, zeros } from '@/matching/embedder';
import { WEIGHTS } from '@/matching/weights';

// Rocchio-style update: move toward the candidate on a positive label, away on
// a negative label, then renormalise.
export function updateTaste(
  taste: Vector | undefined,
  candidateText: Vector,
  label: 0 | 1,
  strength: number,
): Vector {
  const direction = label === 1 ? 1 : -1;
  const rate = WEIGHTS.tasteRate * strength;
  const base = taste ?? zeros(candidateText.length);
  return normalize(add(base, scale(candidateText, rate * direction)));
}
