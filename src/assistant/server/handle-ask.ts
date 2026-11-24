import { answerQuestion, REFUSED } from '@/assistant';
import { calendarAnswer, clampTime } from '@/assistant/calendar';
import { inScope, matchEntities } from '@/assistant/scope';
import { buildSuggestions } from '@/assistant/suggestions';
import { attempt, cappedGenerate, clientIp, isInstallId, jsonResponse, logFailure, rateLimited, readJsonBody } from '@/assistant/server/http';
import type { AskDeps } from '@/assistant/server/types';
import { ASK_MAX_QUESTION_CHARS, type AskRequest } from '@/lib/assistant-contract';

async function readInput(request: Request): Promise<AskRequest | null> {
  const body = await readJsonBody(request);
  if (typeof body !== 'object' || body === null || !('question' in body) || !('eventTime' in body) || !('installId' in body)) return null;
  const { question, eventTime, installId } = body;
  if (typeof question !== 'string' || !question.trim() || question.trim().length > ASK_MAX_QUESTION_CHARS) return null;
  if (
    typeof eventTime !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(eventTime) ||
    !Number.isFinite(Date.parse(eventTime))
  ) return null;
  if (!isInstallId(installId)) return null;
  return { question: question.trim(), eventTime, installId };
}

export async function cacheAddress(question: string, eventTime: Date, version: string): Promise<{ key: string; ttl: number }> {
  const { now, clause } = clampTime(eventTime);
  const timeDependent = calendarAnswer(question, eventTime, matchEntities(question)) !== null;
  // Not scope.normalize(): that drops punctuation, and clause splits on punctuation can change the answer.
  const normalized = question.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const bucket = timeDependent ? Math.floor(now.getTime() / 300000) : '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([normalized, bucket, clause])));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { key: `v1:${version}:answer:${hash}`, ttl: timeDependent ? 300 : 86400 };
}

export async function handleAsk(request: Request, deps: AskDeps): Promise<Response> {
  if (request.method !== 'POST') return jsonResponse({ error: 'invalid_request' }, 405, { Allow: 'POST' });
  try {
    const input = await readInput(request);
    if (!input) return jsonResponse({ error: 'invalid_request' }, 400);
    const ip = clientIp(request);
    // null when the limiter is down: nothing then bounds this request, so it skips the cache and the model.
    const limits = await attempt('Assistant rate limit failed', () => deps.rateLimit(input.installId, ip), null);
    const blocked = rateLimited(limits, deps.now());
    if (blocked) return blocked;
    // The gate runs before the cache, so a refused question never gets the cached answer of an admitted twin.
    if (!inScope(input.question)) return jsonResponse(REFUSED);
    const eventTime = new Date(input.eventTime);
    const { key, ttl } = await cacheAddress(input.question, eventTime, deps.cacheVersion);
    const cached = limits ? await attempt('Assistant cache read failed', () => deps.cache.get(key), null) : null;
    if (cached) return jsonResponse({ ...cached, suggestions: buildSuggestions(cached) });
    const result = await answerQuestion({ question: input.question, eventTime }, {
      summaries: deps.summaries,
      generate: async (prompt) => (limits ? await cappedGenerate(prompt, ip, deps) : null),
    });
    if (limits && ['lookup', 'summary', 'generated'].includes(result.kind)) {
      await attempt('Assistant cache write failed', () => deps.cache.set(key, result, ttl), undefined);
    }
    return jsonResponse(result);
  } catch (error) {
    logFailure('Assistant request failed', error);
    return jsonResponse({ error: 'unavailable' }, 503);
  }
}
