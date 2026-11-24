import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { askAssistant, chatEventSetup, parseAskResponse, suggestEventSetup } from '@/lib/assistant-client';
import { ASK_MAX_QUESTION_CHARS } from '@/lib/assistant-contract';
import { SETUP_MAX_HISTORY_TURNS, SETUP_MAX_MESSAGE_CHARS, type SetupTurn } from '@/lib/event-setup';

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

const good = { answer: 'Now: Opening.', kind: 'lookup', sources: [{ type: 'session', id: 's1', title: 'Opening' }] };
let fetchMock: jest.SpiedFunction<typeof fetch>;
const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({ status, ok: status >= 200 && status < 300, json: async () => body } as Response);
const now = new Date('2027-05-20T10:00:00Z');

beforeEach(() => {
  process.env.EXPO_PUBLIC_ASSISTANT_URL = 'https://assistant.example';
  fetchMock = jest.spyOn(globalThis, 'fetch');
});
afterEach(() => {
  fetchMock.mockRestore();
  delete process.env.EXPO_PUBLIC_ASSISTANT_URL;
});

describe('askAssistant', () => {
  it('does not touch the network when the URL is unset or empty', async () => {
    delete process.env.EXPO_PUBLIC_ASSISTANT_URL;
    expect(await askAssistant('hi', now)).toEqual({ ok: false, reason: 'not-configured' });
    process.env.EXPO_PUBLIC_ASSISTANT_URL = '';
    expect(await askAssistant('hi', now)).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects empty and over-long questions before sending', async () => {
    expect(await askAssistant('   ', now)).toEqual({ ok: false, reason: 'invalid' });
    expect(await askAssistant('x'.repeat(ASK_MAX_QUESTION_CHARS + 1), now)).toEqual({ ok: false, reason: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the trimmed question, event time and a stable install id', async () => {
    reply(200, good);
    reply(200, good);
    const first = await askAssistant('  What is on now?  ', now);
    await askAssistant('again', now);
    expect(first).toEqual({ ok: true, response: good });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://assistant.example/api/ask');
    const sent = JSON.parse(String(init?.body));
    expect(sent).toMatchObject({ question: 'What is on now?', eventTime: now.toISOString() });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).installId).toBe(sent.installId);
  });

  it('maps statuses and failures', async () => {
    reply(400, { error: 'invalid_request' });
    expect(await askAssistant('q', now)).toEqual({ ok: false, reason: 'invalid' });
    reply(429, { error: 'rate_limited', retryAfterSec: 12 });
    expect(await askAssistant('q', now)).toEqual({ ok: false, reason: 'rate-limited', retryAfterSec: 12 });
    reply(503, { error: 'unavailable' });
    expect(await askAssistant('q', now)).toEqual({ ok: false, reason: 'unavailable' });
    reply(500, null);
    expect(await askAssistant('q', now)).toEqual({ ok: false, reason: 'unavailable' });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await askAssistant('q', now)).toEqual({ ok: false, reason: 'offline' });
  });

  it('treats a malformed 200 body as unavailable', async () => {
    reply(200, { answer: 'x', kind: 'weird', sources: [] });
    expect(await askAssistant('q', now)).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('parseAskResponse', () => {
  it('accepts legacy responses and preserves valid optional suggestions', () => {
    expect(parseAskResponse(good)).toEqual(good);
    const suggestions = ["What's on now?", 'Where is the venue?', 'Which startups are pitching?'];
    expect(parseAskResponse({ ...good, suggestions })).toEqual({ ...good, suggestions });
    expect(parseAskResponse({ ...good, suggestions: [] })).toEqual({ ...good, suggestions: [] });
    expect(parseAskResponse({ ...good, suggestions: ['x'.repeat(80)] })?.suggestions).toEqual(['x'.repeat(80)]);
    // The previous parser reads only the original three fields, ignoring additive response fields.
    const legacyParse = ({ answer, kind, sources }: typeof good) => ({ answer, kind, sources });
    const extended = { ...good, suggestions };
    expect(legacyParse(extended)).toEqual(good);
  });

  it.each([
    null, undefined, 'question', [4], [''], ['   '], ['x'.repeat(81)], ['a', 'b', 'c', 'd'],
    ['Line\nbreak'], ['A\tB'], ['[Question](https://example.test)'], ['**Question**'],
    ['<b>Question</b>'], ['Question\u200b'], ['https://example.test'],
  ])('rejects malformed suggestions %j', (suggestions) => {
    expect(parseAskResponse({ ...good, suggestions })).toBeNull();
  });

  it('accepts a valid body and rejects bad shapes', () => {
    expect(parseAskResponse(good)).toEqual(good);
    expect(parseAskResponse(null)).toBeNull();
    expect(parseAskResponse({ ...good, answer: 3 })).toBeNull();
    expect(parseAskResponse({ ...good, sources: 'none' })).toBeNull();
    expect(parseAskResponse({ ...good, sources: [{ type: 'nope', id: 'a', title: 'b' }] })).toBeNull();
  });
});

describe('suggestEventSetup', () => {
  it('posts the trimmed sentence and install id to /api/setup and returns only valid fields', async () => {
    reply(200, { name: 'Expo 27', accent: 'teal', features: { map: true, admin: true }, extra: 'x', source: 'model' });
    expect(await suggestEventSetup('  An expo  ')).toEqual({ name: 'Expo 27', accent: 'teal', features: { map: true } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://assistant.example/api/setup');
    expect(JSON.parse(String(init?.body))).toEqual({ sentence: 'An expo', installId: expect.any(String) });
  });

  it('returns null so the keyword rules answer: no URL, too long, none, errors, bad bodies, offline', async () => {
    delete process.env.EXPO_PUBLIC_ASSISTANT_URL;
    expect(await suggestEventSetup('An expo')).toBeNull();
    process.env.EXPO_PUBLIC_ASSISTANT_URL = 'https://assistant.example';
    expect(await suggestEventSetup('x'.repeat(601))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    reply(200, { source: 'none' });
    expect(await suggestEventSetup('An expo')).toBeNull();
    reply(200, { name: 'Expo 27', source: 'other' });
    expect(await suggestEventSetup('An expo')).toBeNull();
    reply(200, { accent: 'gold', source: 'model' });
    expect(await suggestEventSetup('An expo')).toBeNull();
    reply(429, { error: 'rate_limited', retryAfterSec: 5 });
    expect(await suggestEventSetup('An expo')).toBeNull();
    reply(503, { error: 'unavailable' });
    expect(await suggestEventSetup('An expo')).toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await suggestEventSetup('An expo')).toBeNull();
  });

  it('gives up after 15 seconds', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = suggestEventSetup('An expo');
    await jest.advanceTimersByTimeAsync(15000);
    expect(await result).toBeNull();
    jest.useRealTimers();
  });
});

describe('chatEventSetup', () => {
  it('sends only the last six of ten turns and caps a 2400-character assistant turn', async () => {
    const history: SetupTurn[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user', text: i === 9 ? 'x'.repeat(2400) : `Turn ${i}`,
    }));
    history[8].text = 'u'.repeat(601);
    reply(200, { source: 'none' });
    expect(await chatEventSetup({ message: 'hello', history, draft: {} })).toEqual({ source: 'none' });
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(sent.history).toEqual(history.slice(-SETUP_MAX_HISTORY_TURNS).map((turn) => ({
      ...turn, text: turn.text.slice(0, SETUP_MAX_MESSAGE_CHARS),
    })));
    expect(sent.history[0].text).toBe('Turn 4');
    expect(sent.history[5].text).toHaveLength(600);
    expect(history).toHaveLength(10);
    expect(history[9].text).toHaveLength(2400);
  });
  it('sends the message, history and validated draft and accepts a full next draft with a reply', async () => {
    const history = [{ role: 'user' as const, text: 'No reels' }, { role: 'assistant' as const, text: 'Done.' }];
    const draft = { name: 'Earlier', features: { reels: false } };
    const output = { ...draft, accent: 'blue', reply: 'Made it blue.', source: 'model' };
    reply(200, output);
    expect(await chatEventSetup({ message: '  Make it blue  ', history, draft })).toEqual(output);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)))
      .toEqual({ message: 'Make it blue', history, draft, installId: expect.any(String) });
  });
  it('distinguishes source none from an unreachable server and accepts reply-only clarifications', async () => {
    const input = { message: 'small dinner', history: [], draft: {} };
    reply(200, { source: 'none' });
    expect(await chatEventSetup(input)).toEqual({ source: 'none' });
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    expect(await chatEventSetup(input)).toBeNull();
    reply(200, { source: 'model', reply: 'What name would you like?' });
    expect(await chatEventSetup(input)).toEqual({ source: 'model', reply: 'What name would you like?' });
  });
  it('revalidates fields and filters replies at the client boundary', async () => {
    reply(200, { name: 'Node.js Conf', accent: 'gold', features: { map: true, admin: true }, reply: 'https://evil.test ' + 'word '.repeat(70), source: 'model' });
    const output = await chatEventSetup({ message: 'hello', history: [], draft: {} });
    expect(output).toEqual({ features: { map: true }, reply: Array(60).fill('word').join(' '), source: 'model' });
  });
});
