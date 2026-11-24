import { describe, expect, it } from '@jest/globals';

import { clearUnlessFor, forAccount, updateConversation, updateConversationIfOwned, type ConversationState } from '@/components/assistant/conversation-store';

const base: ConversationState = {
  accountId: 'a',
  items: [{ id: 0, role: 'user', text: 'hi' }],
  sending: false,
  nextId: 1,
};

function peek(accountId: string): ConversationState {
  const seen: ConversationState[] = [];
  updateConversation(accountId, (s) => {
    seen.push(s);
    return s;
  });
  return seen[0];
}

describe('forAccount', () => {
  it('keeps the conversation for the same account', () => {
    expect(forAccount(base, 'a')).toBe(base);
  });

  it('reads as empty for another account or after sign-out', () => {
    expect(forAccount(base, 'b')).toEqual({ accountId: 'b', items: [], sending: false, nextId: 0 });
    expect(forAccount(base, null).items).toEqual([]);
  });
});

describe('updateConversation', () => {
  it('survives for one account, resets for the next', () => {
    updateConversation('a', (s) => ({ ...s, items: [{ id: s.nextId, role: 'user', text: 'x' }], nextId: s.nextId + 1 }));
    expect(peek('a')).toMatchObject({ accountId: 'a', nextId: 1 });
    expect(peek('b')).toMatchObject({ accountId: 'b', items: [], nextId: 0 });
  });

  it('drops a late answer after sign-out or an account switch', () => {
    updateConversation('a', (s) => ({ ...s, nextId: 0, sending: true }));
    clearUnlessFor(null);
    updateConversationIfOwned('a', (s) => ({ ...s, items: [{ id: 9, role: 'user', text: 'late' }], nextId: 10 }));
    expect(peek('a')).toMatchObject({ items: [], nextId: 0 });
  });

  it('keeps an answer that arrives while the account is unchanged', () => {
    updateConversation('a', (s) => ({ ...s, nextId: 0 }));
    updateConversationIfOwned('a', (s) => ({ ...s, nextId: 1 }));
    expect(peek('a')).toMatchObject({ nextId: 1 });
  });

  it('clearUnlessFor drops another account conversation', () => {
    updateConversation('a', (s) => ({ ...s, nextId: 5 }));
    clearUnlessFor('b');
    expect(peek('a')).toMatchObject({ nextId: 0 });
  });
});
