import { DEEPSEEK_PRICES, generateDeepSeek } from '@/assistant/server/deepseek';
import { GEMINI_PRICES, generateGemini } from '@/assistant/server/gemini';
import { handleAsk } from '@/assistant/server/handle-ask';
import { handleSetup } from '@/assistant/server/handle-setup';
import { handleChat, type ChatKind } from '@/assistant/chat/handle';
import { jsonResponse } from '@/assistant/server/http';
import { memoryStores } from '@/assistant/server/memory';
import { redisStores } from '@/assistant/server/redis';
import { LIMITS, type AskDeps, type SetupDeps, type Stores } from '@/assistant/server/types';
import summaries from '@/assistant/summaries.json';

type Env = Record<string, string | undefined>;
// Kept between requests while the settings stay the same, so limits and local memory persist.
// Setup has its own per-device and per-IP request limits (a key prefix of its own) but shares Ask's per-IP model limit,
// slots and daily spend, so one address cannot double its model calls.
let built: { settings: string; stores: Stores; setupRateLimit: Stores['rateLimit']; chatRateLimit: Stores['rateLimit'] } | undefined;

/** A number from the environment, or the fallback when unset. The error names the variable, never its value. */
function setting(env: Env, name: string, fallback: number, min = 0, integer = true): number {
  const value = env[name];
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || (integer && !Number.isSafeInteger(parsed))) throw new RangeError(`Invalid ${name}`);
  return parsed;
}

export function buildAskDeps(env: Env, runtimeEnvironment: string | null): AskDeps | null {
  // Vercel's Upstash connection names them KV_REST_API_*; a manual setup uses UPSTASH_REDIS_REST_*.
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if ((!url || !token) && (env.NODE_ENV === 'production' || runtimeEnvironment === null || runtimeEnvironment === 'production')) return null;
  const limits = {
    ipPerMinute: setting(env, 'ASSISTANT_IP_PER_MINUTE', LIMITS.ipPerMinute, 1),
    modelIpPerMinute: setting(env, 'ASSISTANT_MODEL_IP_PER_MINUTE', LIMITS.modelIpPerMinute, 1),
  };
  const environment = env.VERCEL_ENV || env.NODE_ENV || 'local';
  const settings = JSON.stringify([url, token, limits, environment]);
  if (built?.settings !== settings) {
    const stores = (name: string) => (url && token ? redisStores(url, token, limits, name) : memoryStores(Date.now, limits));
    const setupRateLimit = stores(`${environment}:setup`).rateLimit;
    // The festival app's routes get their own request limits too, under the same model limit and spend.
    const chatRateLimit = stores(`${environment}:chat`).rateLimit;
    built = { settings, stores: stores(environment), setupRateLimit, chatRateLimit };
  }
  // The Ask copy names no provider, but gemini has not been called live with a real key: do that before switching.
  const provider = env.ASSISTANT_MODEL_PROVIDER?.trim() || 'deepseek';
  if (provider !== 'deepseek' && provider !== 'gemini') throw new RangeError('Invalid ASSISTANT_MODEL_PROVIDER');
  // A load-test switch: production attendees never get the fake answer, even if the variable is left set there.
  const fakeModel = env.ASSISTANT_FAKE_MODEL === '1' && env.VERCEL_ENV !== 'production' && runtimeEnvironment !== 'production';
  return {
    ...built.stores,
    now: Date.now,
    summaries,
    cacheVersion: env.VERCEL_DEPLOYMENT_ID || 'local',
    maxInflight: setting(env, 'ASSISTANT_MAX_INFLIGHT', 50),
    dailyCapUsd: setting(env, 'ASSISTANT_DAILY_CAP_USD', 5, 0, false),
    prices: provider === 'gemini' ? GEMINI_PRICES : DEEPSEEK_PRICES,
    generate: fakeModel
      ? async () => ({ text: 'See the supplied event facts for Eventor.', costUsd: 0 })
      : provider === 'gemini'
        ? (prompt) => generateGemini(prompt, { apiKey: env.GEMINI_API_KEY })
        : (prompt) => generateDeepSeek(prompt, { apiKey: env.DEEPSEEK_API_KEY }),
  };
}

export function buildSetupDeps(env: Env, runtimeEnvironment: string | null): SetupDeps | null {
  const deps = buildAskDeps(env, runtimeEnvironment);
  return deps && built ? { ...deps, rateLimit: built.setupRateLimit } : null;
}

export function buildChatDeps(env: Env, runtimeEnvironment: string | null): SetupDeps | null {
  const deps = buildAskDeps(env, runtimeEnvironment);
  return deps && built ? { ...deps, rateLimit: built.chatRateLimit } : null;
}

async function configured<T>(build: (env: Env, runtime: string | null) => T | null, handle: (request: Request, deps: T) => Promise<Response>,
  request: Request, env: Env, runtimeEnvironment: string | null): Promise<Response> {
  try {
    const deps = build(env, runtimeEnvironment);
    return deps ? await handle(request, deps) : jsonResponse({ error: 'unavailable' }, 503);
  } catch (error) {
    // Our RangeErrors name the variable only; other messages (an invalid Upstash URL) can quote a value.
    const detail = error instanceof RangeError ? error.message : error instanceof Error ? error.name : typeof error;
    console.error('Assistant configuration failed:', detail);
    return jsonResponse({ error: 'unavailable' }, 503);
  }
}

export function configuredAsk(request: Request, env: Env, runtimeEnvironment: string | null): Promise<Response> {
  return configured(buildAskDeps, handleAsk, request, env, runtimeEnvironment);
}

export function configuredSetup(request: Request, env: Env, runtimeEnvironment: string | null): Promise<Response> {
  return configured(buildSetupDeps, handleSetup, request, env, runtimeEnvironment);
}

export function configuredChat(kind: ChatKind, request: Request, env: Env, runtimeEnvironment: string | null): Promise<Response> {
  return configured(buildChatDeps, (req, deps) => handleChat(kind, req, deps), request, env, runtimeEnvironment);
}
