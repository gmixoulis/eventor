import { describe, expect, it, jest } from '@jest/globals';

import { answerQuestion, REFUSED } from '@/assistant';
import { REFUSAL } from '@/assistant/scope';
import { buildSuggestions } from '@/assistant/suggestions';
import { ASK_KINDS, isAskSuggestion, type AskResponse, type AskSourceType } from '@/lib/assistant-contract';

const response = (type: AskSourceType, title: string): AskResponse => ({
  answer: 'Answer', kind: 'lookup', sources: [{ type, title, id: 'one' }],
});
const examples = ["What's on now?", 'Where is the venue?', 'Which startups are pitching?'];

describe('buildSuggestions', () => {
  it.each([
    ['session', 'Opening', ['Who is speaking at Opening?', 'Where is Opening?']],
    ['speaker', 'Alex Demo', ['When is Alex Demo speaking?']],
    ['pitch', 'Greenmarket Co', ['Which startups are pitching?', 'Summarize Greenmarket Co']],
    ['day', 'Thursday', ["What's on now?"]],
  ] as const)('follows a %s answer with supported questions', (type, title, expected) => {
    expect(buildSuggestions(response(type, title))).toEqual(expected);
  });

  it.each(ASK_KINDS.filter((kind) => kind !== 'refused'))('uses the first source for %s answers', (kind) => {
    const first = response('speaker', 'Alex Demo');
    const input = { ...first, kind, sources: [...first.sources, ...response('session', 'Opening').sources] };
    expect(buildSuggestions(input)).toEqual(['When is Alex Demo speaking?']);
    expect(input.sources).toHaveLength(2);
  });

  it('gives a refused answer three examples across schedule, venue and startups', () => {
    expect(buildSuggestions({ ...response('session', 'Opening'), kind: 'refused' })).toEqual(examples);
    expect(REFUSED).toEqual({ answer: REFUSAL, kind: 'refused', sources: [], suggestions: examples });
    expect(REFUSAL).toBe('I can help with Eventor 2027: the schedule, speakers, sponsors, startups, side events and venue. Try one of these:');
  });

  it('offers general questions for missing or other source types', () => {
    expect(buildSuggestions({ kind: 'lookup', sources: [] })).toEqual(examples);
    for (const type of ['sponsor', 'sideEvent', 'person', 'place'] as const) {
      expect(buildSuggestions(response(type, 'Example'))).toEqual(examples);
    }
  });

  it.each(['', ' '.repeat(10), 'x'.repeat(100), '[Opening](https://example.test)', '<b>Opening</b>', 'Open\u200bing'])
    ('keeps unsafe or overlong entity names out of questions: %s', (title) => {
      const suggestions = buildSuggestions(response('session', title));
      expect(suggestions).toEqual(examples);
      expect(suggestions.every(isAskSuggestion)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

  it('keeps complete names that fit, normalizes whitespace and omits questions that exceed 80 chars', () => {
    expect(buildSuggestions(response('speaker', ' Alex\nDemo '))).toEqual(['When is Alex Demo speaking?']);
    expect(buildSuggestions(response('session', 'x'.repeat(69)))).toEqual([`Where is ${'x'.repeat(69)}?`]);
    const first = buildSuggestions({ kind: 'refused', sources: [] });
    first.pop();
    expect(buildSuggestions({ kind: 'refused', sources: [] })).toEqual(examples);
  });
});

it('attaches suggestions to every assistant answer path without an extra model call', async () => {
  const generate = jest.fn(async () => null);
  for (const question of ['Where is the venue?', 'Summarize today', "What's on now?", 'What is Greenmarket Co building?', 'Tell me a joke']) {
    const answer = await answerQuestion({ question, eventTime: new Date('2026-05-28T11:25:00Z') }, { summaries: {}, generate });
    expect(answer.suggestions).toEqual(buildSuggestions(answer));
    expect(answer.suggestions?.every(isAskSuggestion)).toBe(true);
  }
  expect(generate).toHaveBeenCalledTimes(1);
});
