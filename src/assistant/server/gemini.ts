import type { GeneratePrompt } from '@/assistant/prompt';
import type { ModelFetch, ModelPrices, ModelResult } from '@/assistant/server/types';

/**
 * Checked 2026-11-22 against Google's docs (ai.google.dev now redirects to aistudio.google.com/docs):
 * model page aistudio.google.com/docs/models/gemini-3.1-flash-lite (stable), prices aistudio.google.com/docs/pricing
 * (paid tier, USD per 1M tokens; output includes thinking tokens). Not checked live with a real key.
 */
export const GEMINI = { model: 'gemini-3.1-flash-lite', priceInput: 0.25, priceOutput: 1.5 } as const;
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI.model}:generateContent`;
// The same cap as DeepSeek; Gemini counts thinking tokens inside it.
export const GEMINI_MAX_OUTPUT_TOKENS = 350;
export const GEMINI_PRICES: ModelPrices = { input: GEMINI.priceInput, output: GEMINI.priceOutput, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS };

export function buildGeminiBody(prompt: GeneratePrompt, maxTokens: number) {
  return {
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
    // No tools and no grounding: neither key is ever sent. Minimal is the lowest thinking level Flash-Lite has.
    generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens, thinkingConfig: { thinkingLevel: 'MINIMAL' } },
  };
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The answer text of the first candidate, without thought summaries. */
export function geminiText(payload: unknown): string {
  const first = record(payload) && Array.isArray(payload.candidates) ? payload.candidates[0] : undefined;
  const parts = record(first) && record(first.content) && Array.isArray(first.content.parts) ? first.content.parts : null;
  if (!parts) throw new Error('Gemini response has no parts');
  const texts = parts.filter((part) => record(part) && part.thought !== true && typeof part.text === 'string').map((part) => part.text as string);
  if (!texts.length) throw new Error('Gemini response has no text');
  return texts.join('');
}

function tokens(value: unknown, optional: boolean): number {
  // The API omits zero counts, so an absent output or thinking count is zero.
  if (value === undefined && optional) return 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid token usage');
  return value;
}

/** Cached input is charged at the full input price, so the bill never undercounts. */
export function geminiCost(payload: unknown): number {
  const usage = record(payload) ? payload.usageMetadata : undefined;
  if (!record(usage)) throw new Error('Missing usage');
  const output = tokens(usage.candidatesTokenCount, true) + tokens(usage.thoughtsTokenCount, true);
  return (tokens(usage.promptTokenCount, false) * GEMINI.priceInput + output * GEMINI.priceOutput) / 1e6;
}

const NOT_BILLED: ModelResult = { text: null, costUsd: 0 };

export async function generateGemini(
  prompt: GeneratePrompt,
  options: { apiKey: string | undefined; fetch?: ModelFetch },
): Promise<ModelResult> {
  if (!options.apiKey) {
    console.error('Gemini API key is not set');
    return NOT_BILLED;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let costUsd: number | null = null;
  try {
    // The key travels in a header, never in the URL, so it cannot reach access logs.
    const response = await (options.fetch ?? fetch)(GEMINI_URL, {
      method: 'POST',
      headers: { 'x-goog-api-key': options.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiBody(prompt, GEMINI_MAX_OUTPUT_TOKENS)),
      signal: controller.signal,
    });
    // An error status (400, 403, 429, 5xx) returns no generated content, so it frees the reservation.
    if (!response.ok) {
      console.error(`Gemini HTTP ${response.status}`);
      return NOT_BILLED;
    }
    const payload: unknown = await response.json();
    costUsd = geminiCost(payload);
    return { text: geminiText(payload), costUsd };
  } catch (error) {
    // Without usage (a timeout or an unreadable body) the call may still be billed: null keeps the reservation.
    console.error('Gemini call failed', error instanceof Error ? error.name : typeof error);
    return { text: null, costUsd };
  } finally {
    clearTimeout(timeout);
  }
}
