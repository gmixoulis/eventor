/** Shared shapes for POST /api/ask: the Ask screen sends AskRequest, the assistant server answers. */

export const ASK_MAX_QUESTION_CHARS = 300;
export const ASK_MAX_SUGGESTIONS = 3;
export const ASK_MAX_SUGGESTION_CHARS = 80;

/** Suggestions are short, single-line questions, rendered as plain button labels. */
export function isAskSuggestion(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= ASK_MAX_SUGGESTION_CHARS
    && !/[\p{Cc}\p{Cf}<>\[\]`*_#~]|https?:\/\/|www\./iu.test(value);
}

export type AskRequest = {
  question: string;
  /** The event clock's current time (demo or real) as an ISO date; the server clamps it to the event days. */
  eventTime: string;
  /** Random id kept on the device, used only to rate limit. */
  installId: string;
};

// 'sideEvent' is the wire format; the server sends it as is.
export const ASK_SOURCE_TYPES = ['session', 'speaker', 'sponsor', 'person', 'sideEvent', 'place', 'pitch', 'day'] as const;
export type AskSourceType = (typeof ASK_SOURCE_TYPES)[number];

export type AskSource = { type: AskSourceType; id: string; title: string };

/** lookup: answered from data with no model; summary: stored batch text; generated: DeepSeek; fallback: facts listed because DeepSeek was capped or failed; refused: outside the event. */
export const ASK_KINDS = ['lookup', 'summary', 'generated', 'fallback', 'refused'] as const;
export type AskKind = (typeof ASK_KINDS)[number];

export type AskResponse = { answer: string; kind: AskKind; sources: AskSource[]; suggestions?: string[] };

/** Body of a non-200 reply: 400 invalid_request, 429 rate_limited, 503 unavailable. */
export type AskError = { error: 'invalid_request' | 'rate_limited' | 'unavailable'; retryAfterSec?: number };
