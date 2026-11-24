/** @jest-environment ./src/assistant/server/test-environment.cjs */
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import {
  buildDeepSeekBody, completionCost, completionText, DEEPSEEK_URL, generateDeepSeek,
} from '@/assistant/server/deepseek';
import type { ModelFetch } from '@/assistant/server/types';

const prompt = { system: 'Use facts only.', user: 'Greenmarket Co facts', allowedUrls: [] };
const payload = {
  choices: [{ message: { content: 'An event answer.', reasoning_content: 'Do not return this' } }],
  usage: { prompt_cache_miss_tokens: 1500, prompt_cache_hit_tokens: 500, completion_tokens: 350 },
};
let log: ReturnType<typeof jest.spyOn>;
beforeEach(() => { log = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('sends exactly the five permitted body keys with thinking disabled', () => {
  const body = buildDeepSeekBody(prompt, 350);
  expect(Object.keys(body).sort()).toEqual(['max_tokens', 'messages', 'model', 'temperature', 'thinking']);
  expect(body).toEqual({
    model: 'deepseek-flash', messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
    thinking: { type: 'disabled' }, temperature: 0.2, max_tokens: 350,
  });
  expect(buildDeepSeekBody(prompt, 220).max_tokens).toBe(220);
});
it('reads the answer text and rejects payloads without one', () => {
  expect(completionText({ choices: [{ message: { content: 'Facts.' } }] })).toBe('Facts.');
  for (const invalid of [null, {}, { choices: [] }, { choices: [{ message: { content: 3 } }] }]) expect(() => completionText(invalid)).toThrow();
});
it('parses leading blank lines and ignores reasoning content', async () => {
  const fetcher = jest.fn<ModelFetch>().mockResolvedValue(new Response('\n\n  ' + JSON.stringify(payload)));
  expect(await generateDeepSeek(prompt, { apiKey: 'test-key', fetch: fetcher })).toEqual({ text: 'An event answer.', costUsd: 0.000873 });
  const body = JSON.stringify(buildDeepSeekBody(prompt, 350));
  expect(fetcher).toHaveBeenCalledWith(DEEPSEEK_URL, expect.objectContaining({ method: 'POST', body, signal: expect.any(AbortSignal) }));
});
it('charges peak token prices, conservatively treating unspecified cache tokens as misses', () => {
  expect(completionCost(payload)).toBeCloseTo(0.000873);
  expect(completionCost({ usage: { prompt_tokens: 1500, completion_tokens: 350 } })).toBeCloseTo(0.00087);
  const invalid = [{}, { completion_tokens: -1 }, { prompt_tokens: NaN, completion_tokens: 0 }, { prompt_cache_miss_tokens: 1.2, prompt_cache_hit_tokens: 0, completion_tokens: 0 }];
  for (const usage of invalid) expect(() => completionCost({ usage })).toThrow();
});
it('reports no bill without a key or when DeepSeek answers with an error status, and logs only the status', async () => {
  const unused = jest.fn<ModelFetch>();
  expect(await generateDeepSeek(prompt, { apiKey: '', fetch: unused })).toEqual({ text: null, costUsd: 0 });
  expect(unused).not.toHaveBeenCalled();
  for (const status of [400, 401, 402, 429, 500]) {
    const fetcher: ModelFetch = async () => new Response('{"error":"secret detail"}', { status });
    expect(await generateDeepSeek(prompt, { apiKey: 'test', fetch: fetcher })).toEqual({ text: null, costUsd: 0 });
    expect(log).toHaveBeenLastCalledWith(`DeepSeek HTTP ${status}`);
  }
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret detail');
});
it('keeps the bill unknown for unreadable bodies and failed calls, logging the error name', async () => {
  for (const response of [new Response('{'), new Response('{}')]) {
    expect(await generateDeepSeek(prompt, { apiKey: 'test', fetch: async () => response })).toEqual({ text: null, costUsd: null });
  }
  expect(await generateDeepSeek(prompt, { apiKey: 'test', fetch: async () => { throw new TypeError('offline'); } }))
    .toEqual({ text: null, costUsd: null });
  expect(log).toHaveBeenLastCalledWith('DeepSeek call failed', 'TypeError');
});
it('aborts at ten seconds and keeps the bill unknown', async () => {
  jest.useFakeTimers();
  const fetcher: ModelFetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const result = generateDeepSeek(prompt, { apiKey: 'test', fetch: fetcher });
  await jest.advanceTimersByTimeAsync(10000);
  expect(await result).toEqual({ text: null, costUsd: null });
  expect(jest.getTimerCount()).toBe(0);
});
