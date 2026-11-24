/** @jest-environment ./src/assistant/server/test-environment.cjs */
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { buildDeepSeekBody } from '@/assistant/server/deepseek';
import {
  buildGeminiBody, GEMINI, GEMINI_MAX_OUTPUT_TOKENS, GEMINI_URL, geminiCost, geminiText, generateGemini,
} from '@/assistant/server/gemini';
import type { ModelFetch } from '@/assistant/server/types';

const prompt = { system: 'Use facts only.', user: 'Startup 1 facts', allowedUrls: [] };
const payload = {
  candidates: [{ content: { role: 'model', parts: [{ text: 'Thinking aloud', thought: true }, { text: 'An event answer.' }] }, finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 300, thoughtsTokenCount: 50, totalTokenCount: 2350 },
};
let log: ReturnType<typeof jest.spyOn>;
beforeEach(() => { log = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('sends the system text, the user text and a capped, low-temperature config with no tools or grounding', () => {
  const body = buildGeminiBody(prompt, 350);
  expect(Object.keys(body).sort()).toEqual(['contents', 'generationConfig', 'systemInstruction']);
  expect(body).toEqual({
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 350, thinkingConfig: { thinkingLevel: 'MINIMAL' } },
  });
  expect(JSON.stringify(body)).not.toMatch(/tools|google_search|googleSearch|grounding/i);
  expect(GEMINI_MAX_OUTPUT_TOKENS).toBe(buildDeepSeekBody(prompt, 350).max_tokens);
});
it('sends the key in the x-goog-api-key header, never in the URL', async () => {
  const fetcher = jest.fn<ModelFetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
  expect(await generateGemini(prompt, { apiKey: 'test-key', fetch: fetcher })).toEqual({ text: 'An event answer.', costUsd: 0.001025 });
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe(GEMINI_URL);
  expect(url).not.toContain('test-key');
  expect(url).not.toContain('key=');
  expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(buildGeminiBody(prompt, 350)), signal: expect.any(AbortSignal) });
  expect(init.headers).toEqual({ 'x-goog-api-key': 'test-key', 'Content-Type': 'application/json' });
});
it('reads only the answer parts and rejects payloads without text', () => {
  expect(geminiText(payload)).toBe('An event answer.');
  const invalid = [null, {}, { candidates: [] }, { candidates: [{ content: { parts: [] } }] }, { candidates: [{ content: { parts: [{ text: 'x', thought: true }] } }] }];
  for (const value of invalid) expect(() => geminiText(value)).toThrow();
});
it('charges input, output and thinking tokens, treating absent output counts as zero', () => {
  expect(geminiCost(payload)).toBeCloseTo((2000 * GEMINI.priceInput + 350 * GEMINI.priceOutput) / 1e6, 12);
  expect(geminiCost({ usageMetadata: { promptTokenCount: 1000 } })).toBeCloseTo(0.00025, 12);
  const invalid = [{}, { promptTokenCount: -1 }, { candidatesTokenCount: 5 }, { promptTokenCount: 1.5 }, { promptTokenCount: 1, thoughtsTokenCount: 'many' }];
  for (const usageMetadata of invalid) expect(() => geminiCost({ usageMetadata })).toThrow();
  expect(() => geminiCost({})).toThrow();
});
it('reports no bill without a key or on an error status, and logs only the status', async () => {
  const unused = jest.fn<ModelFetch>();
  expect(await generateGemini(prompt, { apiKey: undefined, fetch: unused })).toEqual({ text: null, costUsd: 0 });
  expect(unused).not.toHaveBeenCalled();
  expect(log).toHaveBeenLastCalledWith('Gemini API key is not set');
  for (const status of [400, 403, 429, 500]) {
    const fetcher: ModelFetch = async () => new Response('{"error":{"message":"secret detail"}}', { status });
    expect(await generateGemini(prompt, { apiKey: 'test', fetch: fetcher })).toEqual({ text: null, costUsd: 0 });
    expect(log).toHaveBeenLastCalledWith(`Gemini HTTP ${status}`);
  }
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret detail');
});
it('keeps the bill unknown for unreadable bodies and failed calls, logging the error name', async () => {
  for (const response of [new Response('{'), new Response('{}'), new Response(JSON.stringify({ candidates: [] }))]) {
    expect(await generateGemini(prompt, { apiKey: 'test', fetch: async () => response })).toEqual({ text: null, costUsd: null });
  }
  expect(await generateGemini(prompt, { apiKey: 'test', fetch: async () => { throw new TypeError('offline'); } }))
    .toEqual({ text: null, costUsd: null });
  expect(log).toHaveBeenLastCalledWith('Gemini call failed', 'TypeError');
});
it('returns the computed bill when usage is present without answer text or with only thought parts', async () => {
  const noText = [
    { usageMetadata: { promptTokenCount: 2000 } },
    { candidates: [], usageMetadata: { promptTokenCount: 2000 } },
    { candidates: [{ finishReason: 'SAFETY' }], usageMetadata: { promptTokenCount: 2000 } },
    { candidates: [{ content: { role: 'model', parts: [] }, finishReason: 'SAFETY' }], usageMetadata: { promptTokenCount: 2000 } },
  ];
  for (const body of noText) {
    const fetcher: ModelFetch = async () => new Response(JSON.stringify(body));
    expect(await generateGemini(prompt, { apiKey: 'test', fetch: fetcher })).toEqual({ text: null, costUsd: 0.0005 });
  }
  const thoughtsOnly = {
    candidates: [{ content: { role: 'model', parts: [{ text: 'Thinking aloud', thought: true }] }, finishReason: 'MAX_TOKENS' }],
    usageMetadata: { promptTokenCount: 2000, thoughtsTokenCount: 350, totalTokenCount: 2350 },
  };
  expect(await generateGemini(prompt, { apiKey: 'test', fetch: async () => new Response(JSON.stringify(thoughtsOnly)) }))
    .toEqual({ text: null, costUsd: 0.001025 });
  const missingPromptCount = { candidates: payload.candidates, usageMetadata: { candidatesTokenCount: 300 } };
  expect(await generateGemini(prompt, { apiKey: 'test', fetch: async () => new Response(JSON.stringify(missingPromptCount)) }))
    .toEqual({ text: null, costUsd: null });
});
it('aborts at ten seconds and keeps the bill unknown', async () => {
  jest.useFakeTimers();
  const fetcher: ModelFetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const result = generateGemini(prompt, { apiKey: 'test', fetch: fetcher });
  await jest.advanceTimersByTimeAsync(10000);
  expect(await result).toEqual({ text: null, costUsd: null });
  expect(jest.getTimerCount()).toBe(0);
});
