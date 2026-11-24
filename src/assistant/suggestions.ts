import { ASK_MAX_SUGGESTIONS, isAskSuggestion, type AskResponse } from '@/lib/assistant-contract';

const EXAMPLES = ["What's on now?", 'Where is the venue?', 'Which startups are pitching?'];

/** Follow-ups use only supported questions and the answer's leading source, with no model call. */
export function buildSuggestions({ kind, sources }: Pick<AskResponse, 'kind' | 'sources'>): string[] {
  if (kind === 'refused') return [...EXAMPLES];
  const source = sources[0];
  const title = source?.title.replace(/\s+/gu, ' ').trim();
  const name = isAskSuggestion(title) ? title : '';
  let candidates: string[];
  switch (source?.type) {
    case 'session': candidates = name ? [`Who is speaking at ${name}?`, `Where is ${name}?`] : []; break;
    case 'speaker': candidates = name ? [`When is ${name} speaking?`] : []; break;
    case 'pitch': candidates = ['Which startups are pitching?', ...(name ? [`Summarize ${name}`] : [])]; break;
    case 'day': candidates = ["What's on now?"]; break;
    default: candidates = EXAMPLES;
  }
  const suggestions = candidates.filter(isAskSuggestion).slice(0, ASK_MAX_SUGGESTIONS);
  return suggestions.length ? suggestions : [...EXAMPLES];
}
