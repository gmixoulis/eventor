import { entities, entityKey, entityUrls, sourcesFor, type Entity } from '@/assistant/catalog';
import { calendarAnswer, clampTime, namesDay, questionDay } from '@/assistant/calendar';
import { linksAnswer, pitchesAnswer, venueAnswer } from '@/assistant/lookups';
import { filterOutput } from '@/assistant/output-filter';
import { buildPrompt, type GeneratePrompt } from '@/assistant/prompt';
import { retrieve } from '@/assistant/retrieval';
import { inScope, matchEntities, normalizeIntent, REFUSAL } from '@/assistant/scope';
import { buildSuggestions } from '@/assistant/suggestions';
import type { AskResponse } from '@/lib/assistant-contract';

export const REFUSED: AskResponse = {
  answer: REFUSAL, kind: 'refused', sources: [], suggestions: buildSuggestions({ kind: 'refused', sources: [] }),
};
const NOT_FOUND = 'I could not find that in the festival information.';

type AssistantDeps = {
  summaries: Record<string, string>;
  /** Returns null when the model is capped or fails; errors it throws reach the caller (the server owns them). */
  generate: (prompt: GeneratePrompt) => Promise<string | null>;
};

function summaryAnswer(question: string, eventTime: Date, matched: Entity[], summaries: Record<string, string>): AskResponse {
  const { now, clause } = clampTime(eventTime);
  // A named pitch, session, side event or sponsor comes first, so "Side Events Thursday" is not read as a day.
  const named = matched.find((e) => e.source.type === 'pitch') ??
    matched.find((e) => ['session', 'sideEvent', 'sponsor'].includes(e.source.type));
  const day = namesDay(question) ? questionDay(question, now) : undefined;
  const target = named ?? entities.find((e) => e.source.type === 'day' && e.source.id === day);
  if (!target) return { answer: clause + NOT_FOUND, kind: 'lookup', sources: sourcesFor(matched) };
  const stored = summaries[entityKey(target)];
  const summary = stored ? filterOutput(stored, entityUrls(target)) : '';
  return {
    answer: (clause ? `${clause.trimEnd()}\n` : '') + (summary || target.facts.slice(0, 5).map((fact) => `- ${fact}`).join('\n')),
    kind: summary ? 'summary' : 'fallback',
    sources: sourcesFor([target]),
  };
}

export async function answerQuestion(input: { question: string; eventTime: Date }, deps: AssistantDeps): Promise<AskResponse> {
  const response = await resolveAnswer(input, deps);
  return { ...response, suggestions: buildSuggestions(response) };
}

async function resolveAnswer(input: { question: string; eventTime: Date }, deps: AssistantDeps): Promise<AskResponse> {
  const { question, eventTime } = input;
  const matched = matchEntities(question);
  if (!inScope(question, matched)) return REFUSED;
  const lookup = linksAnswer(question, matched) ?? venueAnswer(question, matched);
  if (lookup) return lookup;
  const intent = normalizeIntent(question);
  if (/\b(summarize|summarise|summary)\b/.test(intent)) return summaryAnswer(question, eventTime, matched, deps.summaries);
  const calendar = calendarAnswer(question, eventTime, matched);
  if (calendar) return calendar;
  const pitches = pitchesAnswer(question, matched);
  if (pitches) return pitches;
  const retrieved = retrieve(intent, matched);
  if (!retrieved.length) return { answer: NOT_FOUND, kind: 'lookup', sources: [] };
  const urls = [...new Set(retrieved.flatMap((fact) => entityUrls(fact.entity)))];
  const generated = await deps.generate(buildPrompt(question, retrieved.map((fact) => fact.text), urls));
  const answer = generated ? filterOutput(generated, urls) : '';
  return {
    answer: answer || retrieved.map((fact) => `- ${fact.text}`).join('\n'),
    kind: answer ? 'generated' : 'fallback',
    sources: sourcesFor(retrieved.map((fact) => fact.entity)),
  };
}
