import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { LIMITS, SLOT_TTL_MS, type IpLimits, type Stores } from '@/assistant/server/types';
import type { AskResponse } from '@/lib/assistant-contract';

// Each member is one expiring call; pruning and acquisition must be atomic across function instances.
export const ACQUIRE_SLOT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[5])
return 1`;
export const RESERVE_SPEND = `
local total = tonumber(redis.call('GET', KEYS[1]) or '0')
if total + tonumber(ARGV[1]) > tonumber(ARGV[2]) then return 0 end
redis.call('INCRBYFLOAT', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], 172800)
return 1`;
export const SETTLE_SPEND = `
redis.call('INCRBYFLOAT', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], 172800)
return 1`;

/**
 * Keys carry the environment (production, preview, development, local), so a preview or a local run that
 * shares the Upstash database never uses production's limits, slots or cached answers.
 * Production runs ASSISTANT_IP_PER_MINUTE=600 because a whole venue shares one IP.
 */
export function redisStores(url: string, token: string, limits: IpLimits, environment: string): Stores {
  // Retrying a settled spend adjustment could refund twice after a lost response.
  const redis = new Redis({ url, token, retry: false, signal: () => AbortSignal.timeout(5000) });
  const key = (name: string) => `assistant:${environment}:${name}`;
  const limiter = (count: number, window: '1 m' | '1 h', name: string) =>
    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(count, window), prefix: key(name), timeout: 0 });
  const minute = limiter(LIMITS.installPerMinute, '1 m', 'install:minute');
  const hour = limiter(LIMITS.installPerHour, '1 h', 'install:hour');
  const ipMinute = limiter(limits.ipPerMinute, '1 m', 'ip:minute');
  const modelIpMinute = limiter(limits.modelIpPerMinute, '1 m', 'model:ip:minute');
  const slotKey = key('inflight');
  // One spend total for every environment on purpose: the 5 USD cap belongs to the one DeepSeek account.
  const spendKey = (day: string) => `assistant:spend:${day}`;
  return {
    rateLimit: async (installId, ip) => {
      // A limiter counts every call it lets through, so the shared per-IP quota is spent only by a device under its own limits.
      const install = await Promise.all([minute.limit(installId), hour.limit(installId)]);
      const results = install.every((result) => result.success) ? [...install, await ipMinute.limit(ip)] : install;
      await Promise.all(results.map((result) => result.pending));
      return results;
    },
    modelLimit: async (ip) => {
      const result = await modelIpMinute.limit(ip);
      await result.pending;
      return result.success;
    },
    cache: {
      get: (name) => redis.get<AskResponse>(key(name)),
      set: async (name, value, ttl) => { await redis.set(key(name), value, { ex: ttl }); },
    },
    inflight: {
      acquire: async (max, now) => {
        const id = crypto.randomUUID();
        const acquired = await redis.eval(ACQUIRE_SLOT, [slotKey], [now, max, now + SLOT_TTL_MS, id, SLOT_TTL_MS]);
        return acquired === 1 ? id : null;
      },
      release: async (id) => { await redis.zrem(slotKey, id); },
    },
    spend: {
      reserve: async (day, amount, cap) => await redis.eval(RESERVE_SPEND, [spendKey(day)], [amount, cap]) === 1,
      settle: async (day, reserved, actual) => { await redis.eval(SETTLE_SPEND, [spendKey(day)], [actual - reserved]); },
    },
  };
}
