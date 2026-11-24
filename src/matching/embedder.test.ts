import { describe, expect, it } from '@jest/globals';

import { cosine, lexicalEmbedder, norm } from '@/matching/embedder';

describe('lexicalEmbedder', () => {
  it('returns cosine 1 for identical text', async () => {
    const embedder = lexicalEmbedder(['building a marketplace for small businesses']);
    const [a, b] = await embedder.embed([
      'building a marketplace for small businesses',
      'building a marketplace for small businesses',
    ]);
    expect(cosine(a, b)).toBeCloseTo(1, 9);
  });

  it('returns cosine 0 for unrelated text', async () => {
    const embedder = lexicalEmbedder(['apple orchard', 'banana smoothie']);
    const [a, b] = await embedder.embed(['apple orchard', 'banana smoothie']);
    expect(cosine(a, b)).toBeCloseTo(0, 9);
  });

  it('returns L2 normalised vectors', async () => {
    const embedder = lexicalEmbedder(['one two three', 'three four five']);
    const vecs = await embedder.embed(['one two three', 'three four five']);
    for (const vec of vecs) {
      expect(norm(vec)).toBeCloseTo(1, 6);
    }
  });
});
