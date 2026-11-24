import type { GeneratePrompt } from '@/assistant/prompt';
import type { AskResponse } from '@/lib/assistant-contract';

/** costUsd is 0 when the provider (DeepSeek or Gemini) billed nothing and null when the bill is unknown (timeout, unreadable body). */
export type ModelResult = { text: string | null; costUsd: number | null };
export const SLOT_TTL_MS = 30000;
export type ModelFetch = (url: string, init: RequestInit) => Promise<Response>;
/** The configured provider's USD per 1M tokens (input at the uncached price) and its output cap, for the spend reservation. */
export type ModelPrices = { input: number; output: number; maxOutputTokens: number };

/** Requests per window. The two per-IP numbers are the defaults of ASSISTANT_IP_PER_MINUTE and ASSISTANT_MODEL_IP_PER_MINUTE. */
export const LIMITS = { installPerMinute: 10, installPerHour: 60, ipPerMinute: 30, modelIpPerMinute: 60 };
export type IpLimits = Pick<typeof LIMITS, 'ipPerMinute' | 'modelIpPerMinute'>;

export type AskDeps = {
  rateLimit: (installId: string, ip: string) => Promise<{ success: boolean; reset: number }[]>;
  /** The per-IP limit on model calls only; false means answer from the facts instead. */
  modelLimit: (ip: string) => Promise<boolean>;
  cache: {
    get: (key: string) => Promise<AskResponse | null>;
    set: (key: string, value: AskResponse, ttlSec: number) => Promise<void>;
  };
  inflight: {
    acquire: (max: number, now: number) => Promise<string | null>;
    release: (token: string) => Promise<void>;
  };
  spend: {
    reserve: (day: string, amount: number, cap: number) => Promise<boolean>;
    settle: (day: string, reserved: number, actual: number) => Promise<void>;
  };
  generate: (prompt: GeneratePrompt) => Promise<ModelResult>;
  prices: ModelPrices;
  now: () => number;
  summaries: Record<string, string>;
  /** Part of every cache key, so a new deployment never serves answers built from older data or code. */
  cacheVersion: string;
  maxInflight: number;
  dailyCapUsd: number;
};

export type Stores = Pick<AskDeps, 'rateLimit' | 'modelLimit' | 'cache' | 'inflight' | 'spend'>;
/** What one capped model call needs: the per-IP model limit, a slot and the shared daily spend. */
export type ModelDeps = Pick<AskDeps, 'modelLimit' | 'inflight' | 'spend' | 'generate' | 'prices' | 'now' | 'maxInflight' | 'dailyCapUsd'>;
/** POST /api/setup: Ask's model path (per-IP model limit, slots, daily spend) plus its own per-device and per-IP request limits. */
export type SetupDeps = ModelDeps & Pick<AskDeps, 'rateLimit'>;
