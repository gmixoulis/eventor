import type { GeneratePrompt } from '@/assistant/prompt';
import type { ModelFetch, ModelPrices, ModelResult } from '@/assistant/server/types';

export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MAX_OUTPUT_TOKENS = 350;
// deepseek-flash USD per 1M tokens at peak; off-peak is cheaper, so charging these never undercounts.
const PRICE_INPUT_MISS = 0.3;
const PRICE_INPUT_HIT = 0.006;
const PRICE_OUTPUT = 1.2;
export const DEEPSEEK_PRICES: ModelPrices = { input: PRICE_INPUT_MISS, output: PRICE_OUTPUT, maxOutputTokens: MAX_OUTPUT_TOKENS };

export function buildDeepSeekBody(prompt: GeneratePrompt, maxTokens: number) {
  return {
    model: 'deepseek-flash',
    messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
    thinking: { type: 'disabled' },
    temperature: 0.2,
    max_tokens: maxTokens,
  };
}

export function completionText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null || !('choices' in payload) || !Array.isArray(payload.choices)) {
    throw new Error('DeepSeek response has no choices');
  }
  const first: unknown = payload.choices[0];
  if (typeof first !== 'object' || first === null || !('message' in first)) throw new Error('DeepSeek response has no message');
  const message = first.message;
  if (typeof message !== 'object' || message === null || !('content' in message) || typeof message.content !== 'string') {
    throw new Error('DeepSeek response has no text');
  }
  return message.content;
}

function tokens(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid token usage');
  return value;
}

export function completionCost(payload: unknown): number {
  if (typeof payload !== 'object' || payload === null || !('usage' in payload)) throw new Error('Missing usage');
  const usage = payload.usage;
  if (typeof usage !== 'object' || usage === null || !('completion_tokens' in usage)) throw new Error('Missing usage');
  const output = tokens(usage.completion_tokens) * PRICE_OUTPUT;
  if ('prompt_cache_miss_tokens' in usage && 'prompt_cache_hit_tokens' in usage) {
    return (tokens(usage.prompt_cache_miss_tokens) * PRICE_INPUT_MISS + tokens(usage.prompt_cache_hit_tokens) * PRICE_INPUT_HIT + output) / 1e6;
  }
  if (!('prompt_tokens' in usage)) throw new Error('Missing input usage');
  return (tokens(usage.prompt_tokens) * PRICE_INPUT_MISS + output) / 1e6;
}

const NOT_BILLED: ModelResult = { text: null, costUsd: 0 };

export async function generateDeepSeek(
  prompt: GeneratePrompt,
  options: { apiKey: string | undefined; fetch?: ModelFetch },
): Promise<ModelResult> {
  if (!options.apiKey) {
    console.error('DeepSeek API key is not set');
    return NOT_BILLED;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await (options.fetch ?? fetch)(DEEPSEEK_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDeepSeekBody(prompt, MAX_OUTPUT_TOKENS)),
      signal: controller.signal,
    });
    // DeepSeek bills only completed calls, so an error status (402 balance, 429, 5xx) frees the reservation.
    if (!response.ok) {
      console.error(`DeepSeek HTTP ${response.status}`);
      return NOT_BILLED;
    }
    const payload: unknown = await response.json();
    return { text: completionText(payload), costUsd: completionCost(payload) };
  } catch (error) {
    // A timeout or an unreadable body may still be billed: the caller keeps the reservation.
    console.error('DeepSeek call failed', error instanceof Error ? error.name : typeof error);
    return { text: null, costUsd: null };
  } finally {
    clearTimeout(timeout);
  }
}
