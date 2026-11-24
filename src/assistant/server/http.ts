import type { GeneratePrompt } from '@/assistant/prompt';
import type { ModelDeps, ModelPrices } from '@/assistant/server/types';
import type { AskError, AskResponse } from '@/lib/assistant-contract';
import type { EventSetup } from '@/lib/event-setup';

const MAX_BODY_BYTES = 4096;

export function jsonResponse(body: AskResponse | AskError | EventSetup, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/** Logs only the error's name (never the question, id, IP or message). */
export function logFailure(context: string, error: unknown): void {
  console.error(context, error instanceof Error ? error.name : typeof error);
}

/** A failed store call is logged and replaced by the fallback, so a Redis outage degrades the answer instead of failing the request. */
export async function attempt<T>(context: string, call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call();
  } catch (error) {
    logFailure(context, error);
    return fallback;
  }
}

/** The parsed JSON body, or null when it is missing, over the byte cap (with or without content-length) or not UTF-8 JSON. */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > maxBytes || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export const isInstallId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value);

/** IPv4 as is; IPv6 by its /64, because one client can hold a whole /64 and rotate through it. */
export function ipBucket(ip: string): string {
  if (!ip.includes(':')) return ip;
  const address = ip.toLowerCase().replace(/%.*$/, '');
  const mapped = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (mapped) return mapped[1];
  const [head, tail] = address.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const zeros = tail === undefined ? [] : Array<string>(Math.max(0, 8 - left.length - right.length)).fill('0');
  const groups = [...left, ...zeros, ...right].slice(0, 4).map((group) => (parseInt(group, 16) || 0).toString(16));
  return `${groups.join(':')}::/64`;
}

/**
 * The client's address bucket. Vercel sets x-vercel-forwarded-for and x-real-ip itself; the first
 * x-forwarded-for entry is whatever the client wrote, so only the last hop (added by the proxy) is used.
 */
export function clientIp(request: Request): string {
  const header = (name: string) => request.headers.get(name)?.split(',')[0].trim();
  const lastHop = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  return ipBucket(header('x-vercel-forwarded-for') || header('x-real-ip') || lastHop || 'unknown');
}

/** A 429 with Retry-After when any limit refused, else null. */
export function rateLimited(limits: { success: boolean; reset: number }[] | null, now: number): Response | null {
  const blocked = limits?.filter((limit) => !limit.success) ?? [];
  if (!blocked.length) return null;
  const retryAfterSec = Math.max(1, Math.ceil((Math.max(...blocked.map((limit) => limit.reset)) - now) / 1000));
  return jsonResponse({ error: 'rate_limited', retryAfterSec }, 429, { 'Retry-After': String(retryAfterSec) });
}

/** The most a call can cost at the configured provider's prices: UTF-8 bytes bound input tokens, plus 1024 for message framing. */
export function reservedCost(prompt: GeneratePrompt, prices: ModelPrices): number {
  const bytes = new TextEncoder().encode(prompt.system + prompt.user).byteLength + 1024;
  return (bytes * prices.input + prices.maxOutputTokens * prices.output) / 1e6;
}

/** One model call under the per-IP model limit, an in-flight slot and the shared daily spend cap; null when any refuses. */
export async function cappedGenerate(prompt: GeneratePrompt, ip: string, deps: ModelDeps): Promise<string | null> {
  if (!await attempt('Assistant model limit failed', () => deps.modelLimit(ip), false)) return null;
  const token = await attempt('Assistant slot acquire failed', () => deps.inflight.acquire(deps.maxInflight, deps.now()), null);
  if (token === null) return null;
  try {
    const day = new Date(deps.now()).toISOString().slice(0, 10);
    const reserved = reservedCost(prompt, deps.prices);
    if (!await attempt('Assistant spend reserve failed', () => deps.spend.reserve(day, reserved, deps.dailyCapUsd), false)) return null;
    const { text, costUsd } = await attempt('Assistant model call failed', () => deps.generate(prompt), { text: null, costUsd: null });
    // An unknown bill (timeout, unreadable body, a throw) keeps the reservation, so failures cannot bypass the cap.
    if (costUsd !== null) await attempt('Assistant spend settle failed', () => deps.spend.settle(day, reserved, costUsd), undefined);
    return text;
  } finally {
    await attempt('Assistant slot release failed', () => deps.inflight.release(token), undefined);
  }
}
