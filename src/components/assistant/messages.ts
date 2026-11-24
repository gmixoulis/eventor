import type { AskFailure } from '@/lib/assistant-client';
import type { AskResponse } from '@/lib/assistant-contract';

export const STARTERS = [
  "What's on now?",
  "What's next?",
  'Where is the venue?',
  'Which startups are pitching?',
  'Summarize today',
  'Who is speaking today?',
] as const;

/** Shown above a "fallback" answer; every other kind reads as a plain answer. */
export const FALLBACK_LABEL = 'Short answer: the assistant is busy, here are the facts';

export type ConversationItem =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'answer'; response: AskResponse }
  | { id: number; role: 'error'; question: string; reason: AskFailure; retryAfterSec?: number };

export function failureMessage(reason: AskFailure, retryAfterSec?: number): string {
  switch (reason) {
    case 'not-configured': return 'The assistant is not connected in this build yet.';
    case 'offline': return 'The assistant could not be reached. Check your connection and try again.';
    case 'rate-limited':
      return retryAfterSec === undefined
        ? 'Too many questions. Try again in a moment.'
        : `Too many questions. Try again in ${retryAfterSec} seconds.`;
    case 'unavailable': return 'The assistant is unavailable right now. Try again in a moment.';
    case 'invalid': return 'That question could not be sent. Keep it to one short question.';
  }
}

/** Offline and unavailable are worth another try; the other failures will not change by retrying. */
export const canRetry = (reason: AskFailure) => reason === 'offline' || reason === 'unavailable';
