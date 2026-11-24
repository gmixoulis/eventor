import { describe, expect, it } from '@jest/globals';

import {
  createSetupChatState,
  SETUP_DEFAULT_REPLY,
  SETUP_EMPTY_CHANGES_REPLY,
  SETUP_FIRST_MESSAGE,
  SETUP_MAX_HISTORY_TURNS,
  setupChatReducer,
  toConversationItem,
  type SetupDraft,
} from '@/lib/setup-chat';

const initialDraft: SetupDraft = { name: 'Eventor', accent: 'blue', features: {} };

describe('setupChatReducer', () => {
  it('starts with the opening assistant prompt and an empty turn history', () => {
    const state = createSetupChatState(initialDraft);
    expect(state.draft).toEqual(initialDraft);
    expect(state.messages).toEqual([{ id: 0, role: 'assistant', text: SETUP_FIRST_MESSAGE }]);
    expect(state.history).toEqual([]);
  });

  it('applies a model reply as the full next draft and falls back to the default reply text when omitted', () => {
    const start = createSetupChatState({ name: 'Eventor', accent: 'blue', features: { reels: false } });
    const withReply = setupChatReducer(start, {
      type: 'turn',
      message: 'A fintech meetup called New York Fintech Days in green, no sponsors',
      response: {
        source: 'model',
        name: 'New York Fintech Days',
        accent: 'forest',
        features: { sponsors: false },
        reply: 'Named New York Fintech Days, switched to Forest and turned Sponsors off.',
      },
    });
    expect(withReply.draft).toEqual({
      name: 'New York Fintech Days',
      accent: 'forest',
      features: { sponsors: false },
    });
    expect(withReply.messages.slice(-2)).toEqual([
      { id: 1, role: 'user', text: 'A fintech meetup called New York Fintech Days in green, no sponsors' },
      { id: 2, role: 'assistant', text: 'Named New York Fintech Days, switched to Forest and turned Sponsors off.' },
    ]);

    const withoutReply = setupChatReducer(withReply, {
      type: 'turn',
      message: 'Turn everything back on',
      response: { source: 'model', name: 'New York Fintech Days', accent: 'forest', features: {} },
    });
    expect(withoutReply.draft.features).toEqual({});
    expect(withoutReply.messages.at(-1)?.text).toBe(SETUP_DEFAULT_REPLY);
  });

  it('falls back to applySetupRules when the server returns null or source none', () => {
    const start = createSetupChatState(initialDraft);
    const rules = () => ({
      fields: { name: 'Harbour Days', accent: 'teal' as const, features: { reels: false } },
      changes: ['name to Harbour Days', 'colour to Teal', 'Pitch reels off'],
    });

    const onNull = setupChatReducer(start, {
      type: 'turn',
      message: 'Called Harbour Days in teal, no reels',
      response: null,
      rules,
    });
    expect(onNull.draft).toEqual({ name: 'Harbour Days', accent: 'teal', features: { reels: false } });
    expect(onNull.messages.at(-1)?.text).toBe(
      'Updated with simple rules: name to Harbour Days, colour to Teal, Pitch reels off',
    );

    const onNone = setupChatReducer(onNull, {
      type: 'turn',
      message: 'make it green',
      response: { source: 'none' },
      rules: (_msg, draft) => ({ fields: { ...draft, accent: 'forest' }, changes: ['colour to Forest'] }),
    });
    expect(onNone.draft).toEqual({ name: 'Harbour Days', accent: 'forest', features: { reels: false } });
    expect(onNone.messages.at(-1)?.text).toBe('Updated with simple rules: colour to Forest');
  });

  it('shows the hint reply and keeps the draft when rules find no changes', () => {
    const start = createSetupChatState({ name: 'Custom Conf', accent: 'plum', features: { map: false } });
    const next = setupChatReducer(start, {
      type: 'turn',
      message: 'hello there',
      response: null,
      rules: (_msg, draft) => ({ fields: draft, changes: [] }),
    });
    expect(next.draft).toEqual(start.draft);
    expect(next.messages.at(-1)?.text).toBe(SETUP_EMPTY_CHANGES_REPLY);
  });

  it('does not duplicate the user bubble when send precedes turn, and resets on start-over', () => {
    const start = createSetupChatState(initialDraft);
    const sent = setupChatReducer(start, { type: 'send', message: 'make it green' });
    expect(sent.messages).toHaveLength(2);
    const answered = setupChatReducer(sent, {
      type: 'turn',
      message: 'make it green',
      response: { source: 'model', name: 'Eventor', accent: 'forest', features: {}, reply: 'Switched to green.' },
    });
    expect(answered.messages).toHaveLength(3);
    expect(answered.draft.accent).toBe('forest');

    const reset = setupChatReducer(answered, { type: 'start-over', draft: initialDraft });
    expect(reset).toEqual(start);
  });

  it('caps history at the last 6 turns across multi-turn conversations', () => {
    let state = createSetupChatState(initialDraft);
    for (let i = 1; i <= 5; i += 1) {
      state = setupChatReducer(state, {
        type: 'turn',
        message: `user turn ${i}`,
        response: { source: 'model', name: 'Eventor', accent: 'blue', features: {}, reply: `reply ${i}` },
      });
    }
    expect(state.history).toHaveLength(SETUP_MAX_HISTORY_TURNS);
    expect(state.history).toEqual([
      { role: 'user', text: 'user turn 3' },
      { role: 'assistant', text: 'reply 3' },
      { role: 'user', text: 'user turn 4' },
      { role: 'assistant', text: 'reply 4' },
      { role: 'user', text: 'user turn 5' },
      { role: 'assistant', text: 'reply 5' },
    ]);
    expect(state.messages).toHaveLength(1 + 5 * 2);
  });

  it('maps chat messages to MessageBubble ConversationItems', () => {
    expect(toConversationItem({ id: 1, role: 'user', text: 'Pitch' })).toEqual({
      id: 1,
      role: 'user',
      text: 'Pitch',
    });
    expect(toConversationItem({ id: 2, role: 'assistant', text: 'Done' })).toEqual({
      id: 2,
      role: 'answer',
      response: { answer: 'Done', kind: 'generated', sources: [] },
    });
  });
});

describe('startup ideas in the chat', () => {
  it('attaches ideas to the reply and lists them in its text for the next turn', () => {
    const state = setupChatReducer(createSetupChatState(initialDraft), {
      type: 'turn',
      message: 'Spinoff ideas for Startup 1',
      response: {
        source: 'model',
        name: 'Eventor',
        reply: 'Tap one to build its event app.',
        ideas: [{ title: 'OliveRoute', pitch: 'Shared delivery vans for small farms.' }],
      },
    });
    const answer = state.messages[state.messages.length - 1];
    expect(answer.ideas).toEqual([{ title: 'OliveRoute', pitch: 'Shared delivery vans for small farms.' }]);
    expect(answer.text).toBe('Tap one to build its event app.\n• OliveRoute: Shared delivery vans for small farms.');
    expect(state.history[state.history.length - 1].text).toContain('OliveRoute');
    expect(state.draft.name).toBe('Eventor');
  });
});
