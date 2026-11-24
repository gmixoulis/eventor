import type { ConversationItem } from '@/components/assistant/messages';
import {
  applySetupRules, toOverrides, type AccentId, type EventSetup, type FeatureOverrides, type SetupFields, type SetupIdea, type SetupTurn,
} from '@/lib/event-setup';

export const SETUP_FIRST_MESSAGE = 'Tell me about your event: what it is, who it is for, and anything to leave out. Or ask for startup ideas, for example a spinoff of Startup 1.';
export const SETUP_DEFAULT_REPLY = 'Updated the draft.';
export const SETUP_EMPTY_CHANGES_REPLY = "I could not find anything to change. Try 'add tickets' or 'make it green'.";
export const SETUP_MAX_HISTORY_TURNS = 6;

export type SetupDraft = { name: string; accent: AccentId; features: FeatureOverrides };
export type SetupChatMessage = { id: number; role: 'user' | 'assistant'; text: string; ideas?: SetupIdea[] };
export type SetupChatResponse = (EventSetup & { reply?: string }) | null;
export type SetupRulesFn = (message: string, draft: SetupFields) => { fields: SetupFields; changes: string[] };

export type SetupChatState = {
  draft: SetupDraft;
  messages: SetupChatMessage[];
  history: SetupTurn[];
  nextId: number;
  pendingUserText?: string;
};

export type SetupChatEvent =
  | { type: 'send'; message: string }
  | { type: 'turn'; message: string; response: SetupChatResponse; rules?: SetupRulesFn }
  | { type: 'edit-draft'; update: (draft: SetupDraft) => SetupDraft }
  | { type: 'start-over'; draft: SetupDraft };

export function createSetupChatState(draft: SetupDraft): SetupChatState {
  return {
    draft,
    messages: [{ id: 0, role: 'assistant', text: SETUP_FIRST_MESSAGE }],
    history: [],
    nextId: 1,
  };
}

export function setupChatReducer(state: SetupChatState, event: SetupChatEvent): SetupChatState {
  switch (event.type) {
    case 'send': {
      const text = event.message.trim();
      if (!text) return state;
      return {
        ...state,
        messages: [...state.messages, { id: state.nextId, role: 'user', text }],
        nextId: state.nextId + 1,
        pendingUserText: text,
      };
    }
    case 'turn': {
      const text = event.message.trim();
      if (!text) return state;
      let draft: SetupDraft;
      let reply: string;
      let ideas: SetupIdea[] = [];
      if (event.response && event.response.source === 'model') {
        draft = {
          name: event.response.name ?? state.draft.name,
          accent: event.response.accent ?? state.draft.accent,
          features: toOverrides(event.response.features ?? {}),
        };
        const trimmed = event.response.reply?.trim();
        reply = trimmed ? trimmed : SETUP_DEFAULT_REPLY;
        ideas = event.response.ideas ?? [];
        // The ideas go into the text too, so the next turn's history knows what "build the app for X" refers to.
        if (ideas.length) reply = [reply, ...ideas.map((idea) => `• ${idea.title}: ${idea.pitch}`)].join('\n');
      } else {
        const runRules = event.rules ?? applySetupRules;
        const { fields, changes } = runRules(text, state.draft);
        draft = changes.length === 0
          ? state.draft
          : {
              name: fields.name ?? state.draft.name,
              accent: fields.accent ?? state.draft.accent,
              features: toOverrides(fields.features ?? {}),
            };
        reply = changes.length > 0
          ? `Updated with simple rules: ${changes.join(', ')}`
          : SETUP_EMPTY_CHANGES_REPLY;
      }
      const answer = { role: 'assistant' as const, text: reply, ...(ideas.length ? { ideas } : {}) };
      const messages = state.pendingUserText === text
        ? [...state.messages, { id: state.nextId, ...answer }]
        : [
            ...state.messages,
            { id: state.nextId, role: 'user' as const, text },
            { id: state.nextId + 1, ...answer },
          ];
      const nextId = state.pendingUserText === text ? state.nextId + 1 : state.nextId + 2;
      const history: SetupTurn[] = [
        ...state.history,
        { role: 'user' as const, text },
        { role: 'assistant' as const, text: reply },
      ].slice(-SETUP_MAX_HISTORY_TURNS);
      return { draft, messages, history, nextId };
    }
    case 'edit-draft':
      return { ...state, draft: event.update(state.draft) };
    case 'start-over':
      return createSetupChatState(event.draft);
  }
}

export function toConversationItem(message: SetupChatMessage): ConversationItem {
  if (message.role === 'user') return { id: message.id, role: 'user', text: message.text };
  return {
    id: message.id,
    role: 'answer',
    response: { answer: message.text, kind: 'generated', sources: [] },
  };
}
