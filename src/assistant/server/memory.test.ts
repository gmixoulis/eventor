/** @jest-environment ./src/assistant/server/test-environment.cjs */
import { expect, it } from '@jest/globals';
import { memoryStores } from '@/assistant/server/memory';
import { LIMITS } from '@/assistant/server/types';

it('recovers expired slots without letting an old release remove a new slot', async () => {
  const stores = memoryStores(() => 0, LIMITS);
  const first = await stores.inflight.acquire(1, 0);
  expect(first).not.toBeNull();
  expect(await stores.inflight.acquire(1, 1)).toBeNull();
  expect(await stores.inflight.acquire(1, 30001)).not.toBeNull();
  if (first) await stores.inflight.release(first);
  expect(await stores.inflight.acquire(1, 30002)).toBeNull();
});
it('atomically reserves the daily budget, settles usage and starts a fresh UTC day', async () => {
  const stores = memoryStores(() => 0, LIMITS);
  expect(await Promise.all([stores.spend.reserve('2026-11-21', 0.6, 1), stores.spend.reserve('2026-11-21', 0.6, 1)])).toEqual([true, false]);
  await stores.spend.settle('2026-11-21', 0.6, 0.1);
  expect(await stores.spend.reserve('2026-11-21', 0.6, 1)).toBe(true);
  expect(await stores.spend.reserve('2026-11-22', 0.6, 1)).toBe(true);
});
it('expires cached answers by TTL', async () => {
  let now = 0;
  const stores = memoryStores(() => now, LIMITS);
  const value = { kind: 'lookup', answer: 'Facts', sources: [] } as const;
  await stores.cache.set('key', { ...value, sources: [] }, 300);
  expect(await stores.cache.get('key')).toEqual(value);
  now = 300001;
  expect(await stores.cache.get('key')).toBeNull();
});
it('does not let a device over its own limits spend the shared per-IP quota', async () => {
  const stores = memoryStores(() => 0, { ...LIMITS, ipPerMinute: 15 });
  for (let i = 0; i < 30; i++) await stores.rateLimit('stuck-device', 'venue-ip');
  // The stuck device spent 10 of the 15: five more devices still get in, the sixth does not.
  for (let i = 0; i < 5; i++) expect((await stores.rateLimit(`device-${i}`, 'venue-ip')).every((limit) => limit.success)).toBe(true);
  expect((await stores.rateLimit('device-6', 'venue-ip'))[2].success).toBe(false);
});
it('limits model calls per IP on their own counter', async () => {
  let now = 0;
  const stores = memoryStores(() => now, { ...LIMITS, modelIpPerMinute: 2 });
  expect([await stores.modelLimit('ip'), await stores.modelLimit('ip'), await stores.modelLimit('ip')]).toEqual([true, true, false]);
  expect(await stores.modelLimit('other-ip')).toBe(true);
  expect((await stores.rateLimit('device', 'ip')).every((limit) => limit.success)).toBe(true);
  now = 60001;
  expect(await stores.modelLimit('ip')).toBe(true);
});
