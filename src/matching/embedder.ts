import { tokenize } from '@/matching/text';
import { WEIGHTS } from '@/matching/weights';

export type Vector = Float32Array | number[];

export interface Embedder {
  id: string;
  dimensions: number;
  embed(texts: string[]): Promise<Vector[]>;
}

export type LexicalEmbedder = Embedder & {
  embedSync(texts: string[]): Vector[];
};

export function zeros(n: number): Vector {
  return new Float32Array(n);
}

export function dot(a: Vector, b: Vector): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a));
}

export function scale(a: Vector, k: number): Vector {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * k;
  return out;
}

export function add(a: Vector, b: Vector): Vector {
  const n = Math.max(a.length, b.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}

export function normalize(a: Vector): Vector {
  const n = norm(a);
  if (n === 0) return new Float32Array(a.length);
  return scale(a, 1 / n);
}

export function cosine(a: Vector, b: Vector): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

function idfOf(docCount: number, docFrequency: number): number {
  return Math.log(1 + docCount / Math.max(docFrequency, 1));
}

export function lexicalEmbedder(corpus: string[]): LexicalEmbedder {
  const docCount = Math.max(corpus.length, 1);
  const docFrequency = new Map<string, number>();
  for (const doc of corpus) {
    for (const stem of new Set(tokenize(doc).map((t) => t.stem))) {
      docFrequency.set(stem, (docFrequency.get(stem) ?? 0) + 1);
    }
  }
  const vocab = [...docFrequency.keys()]
    .sort((a, b) => idfOf(docCount, docFrequency.get(b) ?? 1) - idfOf(docCount, docFrequency.get(a) ?? 1))
    .slice(0, WEIGHTS.vocabCap);
  const index = new Map(vocab.map((stem, i) => [stem, i]));
  const idf = vocab.map((stem) => idfOf(docCount, docFrequency.get(stem) ?? 1));

  const embedOne = (text: string): Vector => {
    const vec = new Float32Array(vocab.length);
    const tf = new Map<string, number>();
    for (const t of tokenize(text)) tf.set(t.stem, (tf.get(t.stem) ?? 0) + 1);
    for (const [stem, freq] of tf) {
      const i = index.get(stem);
      if (i === undefined) continue;
      vec[i] = freq * idf[i];
    }
    return normalize(vec);
  };

  const embedSync = (texts: string[]): Vector[] => texts.map(embedOne);

  return {
    id: 'lexical',
    dimensions: vocab.length,
    embed: async (texts) => embedSync(texts),
    embedSync,
  };
}
