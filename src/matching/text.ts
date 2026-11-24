const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'both', 'but', 'by', 'can',
  'did', 'do', 'does', 'each', 'for', 'from', 'had', 'has', 'have', 'he', 'her', 'hers',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me', 'more', 'most',
  'my', 'no', 'not', 'of', 'on', 'or', 'our', 'ours', 'out', 'own', 'she', 'so', 'some',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'then', 'there', 'these', 'they',
  'this', 'those', 'to', 'too', 'under', 'up', 'us', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'who', 'will', 'with', 'you', 'your', 'yours',
]);

export function stem(word: string): string {
  if (word.endsWith('ing') && word.length - 3 >= 3) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length - 2 >= 3) return word.slice(0, -2);
  if (word.endsWith('s') && word.length - 1 >= 3) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): { stem: string; word: string }[] {
  const out: { stem: string; word: string }[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z]+/)) {
    if (raw.length < 3 || STOP_WORDS.has(raw)) continue;
    out.push({ stem: stem(raw), word: raw });
  }
  return out;
}

export function textSimilarity(
  a: string,
  b: string,
  corpus: string[],
): { score: number; terms: string[] } {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === 0 || bTokens.length === 0) return { score: 0, terms: [] };

  const docFrequency = new Map<string, number>();
  for (const doc of corpus) {
    for (const t of new Set(tokenize(doc).map((tok) => tok.stem))) {
      docFrequency.set(t, (docFrequency.get(t) ?? 0) + 1);
    }
  }
  const docCount = Math.max(corpus.length, 1);
  const idf = (t: string) => Math.log(1 + docCount / (docFrequency.get(t) ?? 1));

  const frequencies = (tokens: { stem: string }[]) => {
    const map = new Map<string, number>();
    for (const t of tokens) map.set(t.stem, (map.get(t.stem) ?? 0) + 1);
    return map;
  };

  const aTf = frequencies(aTokens);
  const bTf = frequencies(bTokens);
  const weight = (tf: Map<string, number>, t: string) => (tf.get(t) ?? 0) * idf(t);

  const shared = [...aTf.keys()].filter((t) => bTf.has(t));

  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (const t of aTf.keys()) aMag += weight(aTf, t) ** 2;
  for (const t of bTf.keys()) bMag += weight(bTf, t) ** 2;
  for (const t of shared) dot += weight(aTf, t) * weight(bTf, t);

  const score = aMag > 0 && bMag > 0 ? dot / (Math.sqrt(aMag) * Math.sqrt(bMag)) : 0;

  const originalWord = new Map<string, string>();
  for (const t of aTokens) if (!originalWord.has(t.stem)) originalWord.set(t.stem, t.word);

  const terms = shared
    .sort((x, y) => weight(bTf, y) + weight(aTf, y) - (weight(bTf, x) + weight(aTf, x)))
    .slice(0, 3)
    .map((t) => originalWord.get(t) ?? t);

  return { score, terms };
}
