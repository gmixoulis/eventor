import { LIMITS, SLOT_TTL_MS, type IpLimits, type Stores } from '@/assistant/server/types';
import type { AskResponse } from '@/lib/assistant-contract';

export function memoryStores(now: () => number, limits: IpLimits): Stores {
  const cache = new Map<string, { value: AskResponse; expires: number }>();
  const rates = new Map<string, number[]>();
  const slots = new Map<string, number>();
  const spend = new Map<string, number>();
  function limit(key: string, max: number, window: number) {
    const time = now();
    for (const [id, stamps] of rates) if ((stamps[stamps.length - 1] ?? 0) <= time - 3600000) rates.delete(id);
    if (rates.size >= 3000 && !rates.has(key)) { const first = rates.keys().next().value; if (first) rates.delete(first); }
    const recent = (rates.get(key) ?? []).filter((stamp) => stamp > time - window);
    const success = recent.length < max;
    if (success) recent.push(time);
    rates.set(key, recent);
    return { success, reset: (recent[0] ?? time) + window };
  }
  return {
    rateLimit: async (id, ip) => {
      const install = [limit(`minute:${id}`, LIMITS.installPerMinute, 60000), limit(`hour:${id}`, LIMITS.installPerHour, 3600000)];
      // Same order as the Redis store: a device over its own limits does not spend the shared per-IP quota.
      return install.every((result) => result.success) ? [...install, limit(`ip:${ip}`, limits.ipPerMinute, 60000)] : install;
    },
    modelLimit: async (ip) => limit(`model:${ip}`, limits.modelIpPerMinute, 60000).success,
    cache: {
      get: async (key) => {
        const entry = cache.get(key);
        if (entry && entry.expires > now()) return entry.value;
        cache.delete(key);
        return null;
      },
      set: async (key, value, ttl) => {
        for (const [id, entry] of cache) if (entry.expires <= now()) cache.delete(id);
        if (cache.size >= 1000) { const first = cache.keys().next().value; if (first) cache.delete(first); }
        cache.set(key, { value, expires: now() + ttl * 1000 });
      },
    },
    inflight: {
      acquire: async (max, time) => {
        for (const [id, expires] of slots) if (expires <= time) slots.delete(id);
        if (slots.size >= max) return null;
        const id = crypto.randomUUID();
        slots.set(id, time + SLOT_TTL_MS);
        return id;
      },
      release: async (id) => { slots.delete(id); },
    },
    spend: {
      reserve: async (day, amount, cap) => {
        for (const date of spend.keys()) if (date < day) spend.delete(date);
        const total = spend.get(day) ?? 0;
        if (total + amount > cap) return false;
        spend.set(day, total + amount);
        return true;
      },
      settle: async (day, reserved, actual) => { spend.set(day, (spend.get(day) ?? 0) + actual - reserved); },
    },
  };
}
