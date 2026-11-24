/** @jest-environment ./src/assistant/server/test-environment.cjs */
import { beforeEach, expect, it, jest } from '@jest/globals';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { ACQUIRE_SLOT, redisStores, RESERVE_SPEND, SETTLE_SPEND } from '@/assistant/server/redis';
import { LIMITS } from '@/assistant/server/types';

jest.mock('@upstash/redis', () => ({ Redis: jest.fn(() => mockClient) }));
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(jest.fn(() => ({ limit: mockLimit })), { slidingWindow: jest.fn((count, window) => ({ count, window })) }),
}));

const get = jest.fn<(...args: unknown[]) => Promise<null>>();
const set = jest.fn<(...args: unknown[]) => Promise<'OK'>>();
const evalCommand = jest.fn<(...args: unknown[]) => Promise<number>>();
const zrem = jest.fn<(...args: unknown[]) => Promise<number>>();
const mockLimit = jest.fn(async (..._args: unknown[]) => ({ success: true, reset: 10000, pending: Promise.resolve() }));
const mockClient = { get, set, eval: evalCommand, zrem };
const stores = () => redisStores('https://redis.test', 'test', LIMITS, 'production');

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(null);
  set.mockResolvedValue('OK');
  evalCommand.mockResolvedValue(1);
  zrem.mockResolvedValue(1);
});

it('wires the four limiters and awaits all limit checks', async () => {
  const redis = stores();
  expect(jest.mocked(Ratelimit).mock.calls.map(([config]) => config.limiter)).toEqual([
    { count: 10, window: '1 m' }, { count: 60, window: '1 h' }, { count: 30, window: '1 m' }, { count: 60, window: '1 m' },
  ]);
  await redis.rateLimit('install', 'ip');
  expect(mockLimit.mock.calls).toEqual([['install'], ['install'], ['ip']]);
  expect(jest.mocked(Redis).mock.calls[0][0]).toMatchObject({ retry: false, signal: expect.any(Function) });
});
it('checks the shared per-IP limit only when the device is under its own limits', async () => {
  mockLimit.mockResolvedValueOnce({ success: false, reset: 10000, pending: Promise.resolve() });
  const results = await stores().rateLimit('install', 'ip');
  expect(mockLimit.mock.calls).toEqual([['install'], ['install']]);
  expect(results.map((result) => result.success)).toEqual([false, true]);
});
it('takes raised per-IP limits only when asked', () => {
  redisStores('https://redis.test', 'test', { ipPerMinute: 5000, modelIpPerMinute: 70 }, 'production');
  expect(jest.mocked(Ratelimit).mock.calls.map(([config]) => config.limiter).slice(2)).toEqual([
    { count: 5000, window: '1 m' }, { count: 70, window: '1 m' },
  ]);
});
it('checks model calls on their own per-IP limiter', async () => {
  const redis = stores();
  expect(await redis.modelLimit('ip')).toBe(true);
  mockLimit.mockResolvedValueOnce({ success: false, reset: 10000, pending: Promise.resolve() });
  expect(await redis.modelLimit('ip')).toBe(false);
});
it('prefixes limiter, slot and cache keys with the environment and shares the spend key', async () => {
  const redis = redisStores('https://redis.test', 'test', LIMITS, 'preview');
  expect(jest.mocked(Ratelimit).mock.calls.map(([config]) => config.prefix)).toEqual([
    'assistant:preview:install:minute', 'assistant:preview:install:hour', 'assistant:preview:ip:minute', 'assistant:preview:model:ip:minute',
  ]);
  await redis.inflight.acquire(50, 1000);
  expect(evalCommand.mock.calls[0][1]).toEqual(['assistant:preview:inflight']);
  await redis.cache.get('v1:dpl:answer:hash');
  expect(get).toHaveBeenCalledWith('assistant:preview:v1:dpl:answer:hash');
  await redis.spend.reserve('2026-11-21', 0.01, 5);
  expect(evalCommand.mock.calls[1][1]).toEqual(['assistant:spend:2026-11-21']);
});
it('uses atomic expiring slots and releases only the acquired member', async () => {
  const redis = stores();
  const id = await redis.inflight.acquire(50, 1000);
  expect(id).toEqual(expect.any(String));
  expect(evalCommand).toHaveBeenCalledWith(ACQUIRE_SLOT, ['assistant:production:inflight'], [1000, 50, 31000, id, 30000]);
  if (id) await redis.inflight.release(id);
  expect(zrem).toHaveBeenCalledWith('assistant:production:inflight', id);
  evalCommand.mockResolvedValueOnce(0);
  expect(await redis.inflight.acquire(50, 1000)).toBeNull();
});
it('uses a UTC-date spend key and settles only the difference from the reservation', async () => {
  const redis = stores();
  expect(await redis.spend.reserve('2026-11-21', 0.01, 5)).toBe(true);
  expect(evalCommand).toHaveBeenCalledWith(RESERVE_SPEND, ['assistant:spend:2026-11-21'], [0.01, 5]);
  await redis.spend.settle('2026-11-21', 0.01, 0.002);
  expect(evalCommand).toHaveBeenCalledWith(SETTLE_SPEND, ['assistant:spend:2026-11-21'], [-0.008]);
});
it('sets answer-cache TTLs using the installed Redis API', async () => {
  const redis = stores();
  const answer = { answer: 'Facts', kind: 'lookup', sources: [] } as const;
  await redis.cache.set('key', { ...answer, sources: [] }, 300);
  expect(set).toHaveBeenCalledWith('assistant:production:key', answer, { ex: 300 });
  expect(await redis.cache.get('key')).toBeNull();
  expect(get).toHaveBeenCalledWith('assistant:production:key');
});
