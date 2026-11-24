import { useEffect, useSyncExternalStore } from 'react';

import type { ConversationItem } from '@/components/assistant/messages';

/** The app session's conversation, kept for one account. Memory only: a restart starts empty. */
export type ConversationState = {
  accountId: string | null;
  items: ConversationItem[];
  sending: boolean;
  nextId: number;
};

const EMPTY: ConversationState = { accountId: null, items: [], sending: false, nextId: 0 };

/** The state as seen by `accountId`: another account's conversation is never shown, it reads as empty. */
export function forAccount(state: ConversationState, accountId: string | null): ConversationState {
  return state.accountId === accountId ? state : { ...EMPTY, accountId };
}

let current = EMPTY;
const listeners = new Set<() => void>();

/** Applies `change` to the state of `accountId` (resetting it first when the account differs) and notifies readers. */
export function updateConversation(accountId: string | null, change: (s: ConversationState) => ConversationState) {
  current = change(forAccount(current, accountId));
  listeners.forEach((l) => l());
}

/** Like updateConversation, but only while the store still belongs to `accountId`: a late answer after sign-out or an account switch is dropped. */
export function updateConversationIfOwned(accountId: string | null, change: (s: ConversationState) => ConversationState) {
  if (current.accountId !== accountId) return;
  updateConversation(accountId, change);
}

/** Drops a conversation that belongs to another account, so it cannot return when that account signs in again. */
export function clearUnlessFor(accountId: string | null) {
  if (current.accountId !== accountId) updateConversation(accountId, (s) => s);
}

export function useConversationState(accountId: string | null): ConversationState {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => current,
  );
  return forAccount(snapshot, accountId);
}

/** The kept conversation belongs to one account; leaving it (sign-out, another account) drops it even off the chat screen. */
export function useClearOnAccountChange(accountId: string | null) {
  useEffect(() => clearUnlessFor(accountId), [accountId]);
}
