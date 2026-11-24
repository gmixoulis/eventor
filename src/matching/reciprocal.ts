import { cosine } from '@/matching/embedder';
import type { PersonVectors } from '@/matching/vectors';
import { WEIGHTS } from '@/matching/weights';

export type Reciprocal = {
  ab: number;
  ba: number;
  complementary: number;
  networking: number;
  text: number;
};

function harmonicMean(x: number, y: number): number {
  return (2 * x * y) / (x + y);
}

export function reciprocal(a: PersonVectors, b: PersonVectors): Reciprocal {
  const ab = Math.max(0, cosine(a.seeks, b.offers));
  const ba = Math.max(0, cosine(b.seeks, a.offers));
  const complementary =
    ab > 0 && ba > 0 ? harmonicMean(ab, ba) : WEIGHTS.oneSided * Math.max(ab, ba);
  const networking = Math.max(0, cosine(a.network, b.network));
  const text = a.text && b.text ? Math.max(0, cosine(a.text, b.text)) : 0;
  return { ab, ba, complementary, networking, text };
}
