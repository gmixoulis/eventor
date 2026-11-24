import AsyncStorage from '@react-native-async-storage/async-storage';

import { filterOutput } from '@/assistant/output-filter';
import {
  ASK_KINDS,
  ASK_MAX_QUESTION_CHARS,
  ASK_MAX_SUGGESTIONS,
  ASK_SOURCE_TYPES,
  isAskSuggestion,
  type AskKind,
  type AskRequest,
  type AskResponse,
  type AskSource,
  type AskSourceType,
} from '@/lib/assistant-contract';
import {
  hasSetupFields, parseIdeas, parseSetupFields, SETUP_MAX_HISTORY_TURNS, SETUP_MAX_MESSAGE_CHARS, SETUP_MAX_REPLY_WORDS,
  type EventSetup, type SetupFields, type SetupTurn,
} from '@/lib/event-setup';

export type AskFailure = 'not-configured' | 'offline' | 'rate-limited' | 'unavailable' | 'invalid';
type AskResult = { ok: true; response: AskResponse } | { ok: false; reason: AskFailure; retryAfterSec?: number };

const INSTALL_ID_KEY = 'eventor:assistant:install-id';
const TIMEOUT_MS = 15_000;

let memoryId: string | null = null;

// It is only a rate-limit key, not a secret, so Math.random is enough.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

/** The install id: created once, kept in AsyncStorage, in memory when storage fails. */
async function getInstallId(): Promise<string> {
  if (memoryId) return memoryId;
  try {
    const stored = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (stored) return (memoryId = stored);
    memoryId = newId();
    await AsyncStorage.setItem(INSTALL_ID_KEY, memoryId);
  } catch {
    memoryId ??= newId();
  }
  return memoryId;
}

const isKind = (v: unknown): v is AskKind => ASK_KINDS.some((k) => k === v);
const isSourceType = (v: unknown): v is AskSourceType => ASK_SOURCE_TYPES.some((t) => t === v);

function isSource(value: unknown): value is AskSource {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'title' in value && typeof value.title === 'string'
    && 'type' in value && isSourceType(value.type);
}

/** Checks a 200 body at the trust boundary; null when it does not match AskResponse. */
export function parseAskResponse(body: unknown): AskResponse | null {
  if (typeof body !== 'object' || body === null) return null;
  if (!('answer' in body) || typeof body.answer !== 'string') return null;
  if (!('kind' in body) || !isKind(body.kind)) return null;
  if (!('sources' in body) || !Array.isArray(body.sources) || !body.sources.every(isSource)) return null;
  if ('suggestions' in body && (!Array.isArray(body.suggestions)
    || body.suggestions.length > ASK_MAX_SUGGESTIONS || !body.suggestions.every(isAskSuggestion))) return null;
  return {
    answer: body.answer, kind: body.kind, sources: body.sources,
    ...('suggestions' in body ? { suggestions: body.suggestions as string[] } : {}),
  };
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function askAssistant(question: string, eventTime: Date): Promise<AskResult> {
  const base = process.env.EXPO_PUBLIC_ASSISTANT_URL;
  if (!base) return { ok: false, reason: 'not-configured' };
  const text = question.trim();
  if (text.length === 0 || text.length > ASK_MAX_QUESTION_CHARS) return { ok: false, reason: 'invalid' };

  const payload: AskRequest = { question: text, eventTime: eventTime.toISOString(), installId: await getInstallId() };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.status === 400) return { ok: false, reason: 'invalid' };
    if (res.status === 429) {
      const err = await readJson(res);
      const retry = typeof err === 'object' && err !== null && 'retryAfterSec' in err && typeof err.retryAfterSec === 'number'
        ? err.retryAfterSec : undefined;
      return { ok: false, reason: 'rate-limited', retryAfterSec: retry };
    }
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const response = parseAskResponse(await readJson(res));
    return response ? { ok: true, response } : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

type SetupPayload = { message: string; history: SetupTurn[]; draft: SetupFields } | { sentence: string };

async function sendEventSetup(payload: SetupPayload): Promise<EventSetup | null> {
  const base = process.env.EXPO_PUBLIC_ASSISTANT_URL;
  const message = 'message' in payload ? payload.message : payload.sentence;
  const text = message.trim();
  if (!base || !text || message.length > SETUP_MAX_MESSAGE_CHARS) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ...('message' in payload ? { message: text } : { sentence: text }), installId: await getInstallId() }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = await readJson(res);
    if (typeof body !== 'object' || body === null || !('source' in body)) return null;
    if (body.source === 'none') return { source: 'none' };
    if (body.source !== 'model') return null;
    // Recheck the response at the device boundary, including reply-only clarifications.
    const fields = parseSetupFields(body);
    const reply = 'reply' in body && typeof body.reply === 'string'
      ? filterOutput(body.reply, []).split(/\s+/).slice(0, SETUP_MAX_REPLY_WORDS).join(' ').trim() : '';
    const ideas = parseIdeas(body);
    return hasSetupFields(fields) || reply || ideas.length
      ? { ...fields, ...(reply ? { reply } : {}), ...(ideas.length ? { ideas } : {}), source: 'model' } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A full next draft or source none; null when the setup service cannot be reached or returns an invalid response. */
export async function chatEventSetup(input: { message: string; history: SetupTurn[]; draft: SetupFields }): Promise<EventSetup & { reply?: string } | null> {
  const history = input.history.slice(-SETUP_MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, SETUP_MAX_MESSAGE_CHARS) }));
  return sendEventSetup({ ...input, history, draft: parseSetupFields(input.draft) });
}

/** Legacy callers still receive only suggested fields, or null to use their keyword rules. */
export async function suggestEventSetup(sentence: string): Promise<SetupFields | null> {
  const response = await sendEventSetup({ sentence });
  if (!response || response.source === 'none') return null;
  const fields = parseSetupFields(response);
  return hasSetupFields(fields) ? fields : null;
}
