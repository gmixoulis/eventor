import { entities, type Entity } from '@/assistant/catalog';
import { cosine, lexicalEmbedder } from '@/matching/embedder';

// The shared tokenizer drops words under three letters, so spell out the event's short terms on both sides.
const SHORT_TERMS: [RegExp, string][] = [[/\bAI\b/gi, 'AI artificial intelligence'], [/\bVCs?\b/gi, 'VC venture capital investors']];
function expandShortTerms(text: string): string {
  return SHORT_TERMS.reduce((value, [pattern, words]) => value.replace(pattern, words), text);
}

const facts = entities.filter((e) => e.source.type !== 'day').flatMap((entity) => entity.facts.map((text) => ({ text, entity })));
// Keep each index below the matching embedder's 512-term cap so common event words survive.
const FACTS_PER_INDEX = 12;
const indexes = Array.from({ length: Math.ceil(facts.length / FACTS_PER_INDEX) }, (_, index) => {
  const batch = facts.slice(index * FACTS_PER_INDEX, (index + 1) * FACTS_PER_INDEX);
  const texts = batch.map((fact) => expandShortTerms(fact.text));
  const embedder = lexicalEmbedder(texts);
  return { batch, embedder, vectors: embedder.embedSync(texts) };
});

export function retrieve(question: string, matched: Entity[]): typeof facts {
  return indexes.flatMap(({ batch, embedder, vectors }) => {
    const [query] = embedder.embedSync([expandShortTerms(question)]);
    return batch.map((fact, i) => ({ fact, score: cosine(query, vectors[i]) + (matched.includes(fact.entity) ? 1 : 0) }));
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5).map(({ fact }) => fact);
}
