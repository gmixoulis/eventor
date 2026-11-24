/** @jest-environment ./src/assistant/server/test-environment.cjs */
import { afterEach, expect, it, jest } from '@jest/globals';
import { buildAskDeps, buildSetupDeps, configuredAsk, configuredSetup } from '@/assistant/server/config';
import { DEEPSEEK_PRICES } from '@/assistant/server/deepseek';
import { GEMINI_PRICES } from '@/assistant/server/gemini';
import { memoryStores } from '@/assistant/server/memory';
import { redisStores } from '@/assistant/server/redis';
import { LIMITS } from '@/assistant/server/types';

// The real Redis store is covered in redis.test.ts; here only what config passes to it matters.
jest.mock('@/assistant/server/redis', () => ({ redisStores: jest.fn() }));
const redis = { KV_REST_API_URL: 'https://example.test', KV_REST_API_TOKEN: 'token' };
const prompt = { system: '', user: '', allowedUrls: [] };

afterEach(() => { jest.restoreAllMocks(); });
it.each([{ NODE_ENV: 'production' }, { UPSTASH_REDIS_REST_URL: 'https://example.test', NODE_ENV: 'production' }, { KV_REST_API_URL: 'https://example.test', NODE_ENV: 'production' }])('fails closed without complete production Upstash configuration', async (env) => {
  expect(buildAskDeps(env, 'preview')).toBeNull();
  const response = await configuredAsk(new Request('https://example.test'), env, 'preview');
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'unavailable' });
});
it('accepts the KV_REST_API_* names set by the Vercel Upstash connection', () => {
  jest.mocked(redisStores).mockReturnValue(memoryStores(Date.now, LIMITS));
  expect(buildAskDeps({ ...redis, NODE_ENV: 'production' }, 'production')).not.toBeNull();
});
it('treats Expo null and production environments as production', () => {
  expect(buildAskDeps({}, null)).toBeNull();
  expect(buildAskDeps({}, 'production')).toBeNull();
});
it('uses local stores and a free fake model in development', async () => {
  const services = buildAskDeps({ ASSISTANT_FAKE_MODEL: '1' }, 'development');
  expect(services).toMatchObject({ maxInflight: 50, dailyCapUsd: 5 });
  expect(await services?.generate(prompt)).toMatchObject({ costUsd: 0, text: expect.any(String) });
});
it('ignores the fake model in production, so attendees never get its answer', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.mocked(redisStores).mockReturnValue(memoryStores(Date.now, LIMITS));
  for (const [env, runtime] of [[{ VERCEL_ENV: 'production' }, 'preview'], [{}, 'production']] as const) {
    const services = buildAskDeps({ ...redis, ...env, ASSISTANT_FAKE_MODEL: '1' }, runtime);
    // No DEEPSEEK_API_KEY here, so the real model path answers "not billed" without a request.
    expect(await services?.generate(prompt)).toEqual({ text: null, costUsd: 0 });
  }
  expect(log).toHaveBeenCalledWith('DeepSeek API key is not set');
  const preview = buildAskDeps({ ...redis, VERCEL_ENV: 'preview', ASSISTANT_FAKE_MODEL: '1' }, 'preview');
  expect(await preview?.generate(prompt)).toMatchObject({ costUsd: 0, text: expect.any(String) });
});
it('passes the environment and both per-IP limits to the Redis stores', () => {
  jest.mocked(redisStores).mockReturnValue(memoryStores(Date.now, LIMITS));
  buildAskDeps({ ...redis, VERCEL_ENV: 'preview', NODE_ENV: 'production', ASSISTANT_IP_PER_MINUTE: '600' }, 'preview');
  expect(redisStores).toHaveBeenLastCalledWith(redis.KV_REST_API_URL, redis.KV_REST_API_TOKEN, { ipPerMinute: 600, modelIpPerMinute: 60 }, 'preview');
  buildAskDeps({ ...redis, NODE_ENV: 'development', ASSISTANT_MODEL_IP_PER_MINUTE: '5' }, 'development');
  expect(redisStores).toHaveBeenLastCalledWith(redis.KV_REST_API_URL, redis.KV_REST_API_TOKEN, { ipPerMinute: 30, modelIpPerMinute: 5 }, 'development');
  buildAskDeps({ ...redis, ASSISTANT_IP_PER_MINUTE: '31' }, 'development');
  expect(redisStores).toHaveBeenLastCalledWith(redis.KV_REST_API_URL, redis.KV_REST_API_TOKEN, { ipPerMinute: 31, modelIpPerMinute: 60 }, 'local');
});
it('returns a safe 503 for invalid settings and logs which variable, never its value', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const env of [{ ASSISTANT_MAX_INFLIGHT: 'NaN' }, { ASSISTANT_MODEL_IP_PER_MINUTE: '0' }, { ASSISTANT_IP_PER_MINUTE: '1.5' }]) {
    const response = await configuredAsk(new Request('https://example.test'), env, 'development');
    expect(response.status).toBe(503);
    expect(log).toHaveBeenLastCalledWith('Assistant configuration failed:', `Invalid ${Object.keys(env)[0]}`);
  }
});
it('logs only the name of an error whose message could quote a setting', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.mocked(redisStores).mockImplementationOnce(() => { throw new Error('Received: "https://secret.test"'); });
  const response = await configuredAsk(new Request('https://example.test'), { ...redis, VERCEL_ENV: 'other' }, 'development');
  expect(response.status).toBe(503);
  expect(log).toHaveBeenCalledWith('Assistant configuration failed:', 'Error');
});
it('uses DeepSeek by default and Gemini when chosen, each answering "not billed" without its own key', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const fetcher = jest.spyOn(globalThis, 'fetch');
  for (const [env, message] of [
    [{}, 'DeepSeek API key is not set'],
    [{ ASSISTANT_MODEL_PROVIDER: 'deepseek' }, 'DeepSeek API key is not set'],
    [{ ASSISTANT_MODEL_PROVIDER: 'gemini', DEEPSEEK_API_KEY: 'deepseek-only' }, 'Gemini API key is not set'],
    [{ ASSISTANT_MODEL_PROVIDER: ' gemini ' }, 'Gemini API key is not set'],
  ] as const) {
    expect(await buildAskDeps(env, 'development')?.generate(prompt)).toEqual({ text: null, costUsd: 0 });
    expect(log).toHaveBeenLastCalledWith(message);
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('reserves spend at the configured provider prices, for Ask and setup alike', () => {
  expect(buildAskDeps({}, 'development')?.prices).toBe(DEEPSEEK_PRICES);
  expect(buildSetupDeps({ ASSISTANT_MODEL_PROVIDER: 'deepseek' }, 'development')?.prices).toBe(DEEPSEEK_PRICES);
  expect(buildAskDeps({ ASSISTANT_MODEL_PROVIDER: 'gemini' }, 'development')?.prices).toBe(GEMINI_PRICES);
  expect(buildSetupDeps({ ASSISTANT_MODEL_PROVIDER: 'gemini' }, 'development')?.prices).toBe(GEMINI_PRICES);
});
it('returns a safe 503 for an unknown provider and logs only the variable name', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const configured of [configuredAsk, configuredSetup]) {
    const response = await configured(new Request('https://example.test'), { ASSISTANT_MODEL_PROVIDER: 'openai-secret' }, 'development');
    expect(response.status).toBe(503);
    expect(log).toHaveBeenLastCalledWith('Assistant configuration failed:', 'Invalid ASSISTANT_MODEL_PROVIDER');
  }
  expect(JSON.stringify(log.mock.calls)).not.toContain('openai-secret');
});
it('gives setup its own Redis key prefix for request limits, but the same per-IP model limit, slots and daily spend as Ask', () => {
  const ask = memoryStores(Date.now, LIMITS);
  const setup = memoryStores(Date.now, LIMITS);
  jest.mocked(redisStores).mockImplementation((_url, _token, _limits, environment) => (environment.endsWith(':setup') ? setup : ask));
  const deps = buildSetupDeps({ ...redis, VERCEL_ENV: 'preview-setup-test' }, 'preview');
  expect(redisStores).toHaveBeenCalledWith(redis.KV_REST_API_URL, redis.KV_REST_API_TOKEN, expect.anything(), 'preview-setup-test:setup');
  expect(deps?.rateLimit).toBe(setup.rateLimit);
  expect(deps?.modelLimit).toBe(ask.modelLimit);
  expect(deps?.spend).toBe(ask.spend);
  expect(deps?.inflight).toBe(ask.inflight);
  expect(buildSetupDeps({}, 'production')).toBeNull();
});
