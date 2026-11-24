import { useRef } from 'react';

import { updateConversation, updateConversationIfOwned, useConversationState } from '@/components/assistant/conversation-store';
import type { ConversationItem } from '@/components/assistant/messages';
import { askAssistant } from '@/lib/assistant-client';
import { useEventClock, useSession } from '@/store';

/** The app session's conversation. It outlives the screen (see conversation-store) but is never persisted. */
export function useConversation() {
  const { now } = useEventClock();
  const accountId = useSession().account?.id ?? null;
  const { items, sending } = useConversationState(accountId);
  const inFlight = useRef(false);

  const run = async (question: string) => {
    inFlight.current = true;
    updateConversation(accountId, (s) => ({ ...s, sending: true }));
    try {
      const result = await askAssistant(question, now);
      updateConversationIfOwned(accountId, (s) => {
        const id = s.nextId;
        const item: ConversationItem = result.ok
          ? { id, role: 'answer', response: result.response }
          : { id, role: 'error', question, reason: result.reason, retryAfterSec: result.retryAfterSec };
        return { ...s, items: [...s.items, item], sending: false, nextId: id + 1 };
      });
    } finally {
      inFlight.current = false;
    }
  };

  /** Returns true when the question was accepted, so the caller can clear its input. */
  const ask = (raw: string): boolean => {
    const question = raw.trim();
    if (!question || sending || inFlight.current) return false;
    updateConversation(accountId, (s) => ({
      ...s,
      items: [...s.items, { id: s.nextId, role: 'user', text: question }],
      nextId: s.nextId + 1,
    }));
    void run(question);
    return true;
  };

  const retry = (failedId: number, question: string) => {
    if (sending || inFlight.current) return;
    updateConversation(accountId, (s) => ({ ...s, items: s.items.filter((i) => i.id !== failedId) }));
    void run(question);
  };

  return { items, sending, ask, retry };
}
