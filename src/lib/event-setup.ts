/** The event setup form: the shape the server and the keyword rules return, its strict check, and how it is saved. */
import type { DeviceSettings } from '@/backend/types';
import { FEATURES, featureLabel, withFeature, type FeatureId } from '@/lib/features';

export const SETUP_MAX_MESSAGE_CHARS = 600;
export const SETUP_MAX_SENTENCE_CHARS = SETUP_MAX_MESSAGE_CHARS;
export const SETUP_MAX_HISTORY_TURNS = 6;
export const SETUP_MAX_REPLY_WORDS = 60;
export const SETUP_MAX_IDEAS = 3;
export const SETUP_IDEA_PITCH_CHARS = 160;

export type SetupTurn = { role: 'user' | 'assistant'; text: string };

/** The 6 action colours; the light and dark values live in constants/theme.ts. */
export const ACCENTS = [
  { id: 'blue', label: 'Blue' },
  { id: 'terracotta', label: 'Terracotta' },
  { id: 'forest', label: 'Forest' },
  { id: 'plum', label: 'Plum' },
  { id: 'ink', label: 'Ink' },
  { id: 'teal', label: 'Teal' },
] as const;
export type AccentId = (typeof ACCENTS)[number]['id'];

export type FeatureOverrides = Partial<Record<FeatureId, boolean>>;
export type SetupFields = { name?: string; accent?: AccentId; features?: FeatureOverrides };
/** A startup or spinoff idea the setup chat suggests; tapping one asks it to build that idea's event app. */
export type SetupIdea = { title: string; pitch: string };
/** POST /api/setup's 200 body. 'none': nothing valid came back, so the app uses its own keyword rules. */
export type EventSetup = SetupFields & { reply?: string; ideas?: SetupIdea[]; source: 'model' | 'none' };

const isAccent = (value: unknown): value is AccentId => ACCENTS.some((accent) => accent.id === value);
const isFeatureId = (value: string): value is FeatureId => FEATURES.some((feature) => feature.id === value);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// A scheme, "www." or a domain-like word ("evil.com", "bit.ly)", "x.io/"): chat apps would turn it into a link.
// The TLD ends at anything but a letter or digit, so trailing punctuation does not hide it. Also refuses "Node.js Conf".
const URL_LIKE = /[a-z][a-z0-9+.-]*:\/\/|www\.|[\p{L}\p{N}-]\.\p{L}{2,24}(?![\p{L}\p{N}])/iu;

/** Checked text: NFKC turns full-width letters and dot look-alikes (U+FF0E, U+FE52, U+2024) into ASCII; the ideographic dot (U+3002, U+FF61) is mapped by hand. */
const linkForm = (name: string) => name.normalize('NFKC').replace(/\u3002/g, '.');

/** The trimmed name with single spaces, or null unless it is 2 to 40 characters with no control characters or links. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const name = value.trim().replace(/ {2,}/g, ' ');
  return name.length >= 2 && name.length <= 40 && !URL_LIKE.test(linkForm(name)) ? name : null;
}

/** Up to 3 ideas, each a clean 2-40 character title and one short pitch line with no links; anything else is dropped. */
export function parseIdeas(value: unknown): SetupIdea[] {
  if (!record(value) || !Array.isArray(value.ideas)) return [];
  const ideas: SetupIdea[] = [];
  for (const item of value.ideas) {
    if (!record(item)) continue;
    const title = cleanName(item.title);
    const pitch = typeof item.pitch === 'string' ? item.pitch.replace(/\s+/g, ' ').trim() : '';
    if (!title || !pitch || pitch.length > SETUP_IDEA_PITCH_CHARS || /[\p{Cc}\p{Cf}]/u.test(pitch) || URL_LIKE.test(linkForm(pitch))) continue;
    if (ideas.some((idea) => idea.title.toLowerCase() === title.toLowerCase())) continue;
    ideas.push({ title, pitch });
    if (ideas.length === SETUP_MAX_IDEAS) break;
  }
  return ideas;
}

/** Keeps only a valid name, a listed accent and known feature ids with boolean values; everything else is dropped. */
export function parseSetupFields(value: unknown): SetupFields {
  if (!record(value)) return {};
  const fields: SetupFields = {};
  const name = cleanName(value.name);
  if (name) fields.name = name;
  if (isAccent(value.accent)) fields.accent = value.accent;
  if (record(value.features)) {
    const features: FeatureOverrides = {};
    for (const [id, on] of Object.entries(value.features)) if (isFeatureId(id) && typeof on === 'boolean') features[id] = on;
    if (Object.keys(features).length) fields.features = features;
  }
  return fields;
}

export const hasSetupFields = (fields: SetupFields): boolean => !!(fields.name || fields.accent || fields.features);

/** Words that name a feature in a setup request. */
const FEATURE_WORDS: [FeatureId | 'tickets', string[]][] = [
  ['people', ['networking', 'matching', 'matchmaking', 'people']],
  ['meetings', ['meetings', 'chat']],
  ['ask', ['ai', 'assistant', 'chatbot']],
  ['mySchedule', ['my schedule']],
  ['schedule', ['schedule', 'agenda']],
  ['speakers', ['speakers']],
  ['sponsors', ['sponsors']],
  ['guide', ['guide']],
  ['map', ['map']],
  ['sideEvents', ['side events']],
  ['leaderboard', ['leaderboard']],
  ['passport', ['passport', 'stamps']],
  ['reels', ['reels', 'pitches']],
  ['announcements', ['announcements']],
  ['qrCode', ['qr code', 'qr']],
  ['tickets', ['ticket', 'tickets', 'ticketing']],
];
const FEATURE_PHRASES = FEATURE_WORDS.flatMap(([id, words]) => words.map((word) => ({ id, word })))
  .sort((a, b) => b.word.length - a.word.length);

const COLOUR_WORDS: [AccentId, string[]][] = [
  ['blue', ['blue', 'navy', 'azure']],
  ['terracotta', ['terracotta', 'orange', 'red', 'rust', 'clay', 'brick']],
  ['forest', ['forest', 'green', 'olive', 'emerald']],
  ['plum', ['plum', 'purple', 'violet', 'lilac', 'magenta']],
  ['ink', ['ink', 'black', 'grey', 'gray', 'charcoal', 'slate']],
  ['teal', ['teal', 'turquoise', 'aqua', 'cyan']],
];

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NAME_COMMAND_WORDS = new Set(['add', 'with', 'turn', 'on', 'enable', 'no', 'without', 'remove', 'off', 'disable']);
for (const [, words] of FEATURE_WORDS) {
  for (const word of words) for (const part of word.split(/\s+/)) NAME_COMMAND_WORDS.add(part);
}

/** The name in quotes, or after "called" / "named" / "call it" up to a comma or a joining word. */
function nameFrom(sentence: string): string | undefined {
  const quoted = /["“”«]([^"“”«»]{2,60})["“”»]/.exec(sentence)?.[1];
  const called = /\b(?:called|named|call it)\s+(.+?)(?=\s*(?:[,;!?()]|[.:](?:\s|$))|\s+(?:with|without|for|in|on|at|and|but|that|where|which|no)\b|$)/i.exec(sentence)?.[1];
  const quotedWord = quoted?.trim().toLowerCase();
  const reservedQuote = [...FEATURE_WORDS, ...COLOUR_WORDS].some(([, words]) => words.some((word) => word === quotedWord));
  const candidate = quoted ?? called;
  const nameWords = candidate?.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (reservedQuote || !nameWords.some((word) => !NAME_COMMAND_WORDS.has(word))) return undefined;
  return cleanName(candidate) ?? undefined;
}

/** A negation keyword, and the words that keep its list going: a joiner, an article/filler, or any word that names a feature. */
const NEGATION = /\b(?:no|without)\b/g;
const LIST_WORDS = new Set(['and', 'or', 'nor', ',', 'the', 'a', 'an', 'any', 'no']);
for (const [, words] of FEATURE_WORDS) {
  for (const word of words) for (const part of word.split(/\s+/)) LIST_WORDS.add(part);
}

/** The end of the list that follows a negation: it stops at the first word that is none of the above. */
function listEnd(text: string, from: number): number {
  const token = /\s*([\p{L}\p{N}]+|,)/gu;
  token.lastIndex = from;
  let end = from;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text))) {
    if (LIST_WORDS.has(match[1])) end = match.index + match[0].length;
    else break;
  }
  return end;
}

/** Extract explicit feature choices in message order, so the last instruction for a switch wins. */
function featureChanges(text: string, commands: RegExp): FeatureOverrides {
  const features: FeatureOverrides = {};
  for (const match of text.matchAll(commands)) {
    const from = match.index + match[0].length;
    let scope = text.slice(from, listEnd(text, from));
    const on = /^(?:add|with|turn on|enable)$/.test(match[0]);
    const matched = new Set<FeatureId | 'tickets'>();
    for (const { id, word } of FEATURE_PHRASES) {
      scope = scope.replace(new RegExp(`\\b${escape(word)}\\b`, 'g'), () => {
        matched.add(id);
        return ' ';
      });
    }
    for (const [id] of FEATURE_WORDS) {
      const feature = FEATURES.find((feature) => feature.id === id);
      if (feature && matched.has(id)) features[feature.id] = on;
    }
  }
  return features;
}

function setupChanges(message: string, commands: RegExp, colourOrder: 'first' | 'last'): SetupFields {
  const text = message.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const features = featureChanges(text, commands);
  let accent: { id: AccentId; at: number } | undefined;
  for (const [id, words] of COLOUR_WORDS) {
    for (const match of text.matchAll(new RegExp(`\\b(?:${words.join('|')})\\b`, 'g'))) {
      const at = match.index;
      if (!accent || (colourOrder === 'first' ? at < accent.at : at > accent.at)) accent = { id, at };
    }
  }
  const fields: SetupFields = {};
  const name = nameFrom(message);
  if (name) fields.name = name;
  if (accent) fields.accent = accent.id;
  if (Object.keys(features).length) fields.features = features;
  return fields;
}

/** Legacy single-sentence suggestions retain their original negation-only feature rules. */
export function suggestSetup(sentence: string): SetupFields {
  return setupChanges(sentence, NEGATION, 'first');
}

/** Merge validated changes without discarding earlier feature choices. */
export function mergeSetupFields(draft: SetupFields, changes: SetupFields): SetupFields {
  const base = parseSetupFields(draft);
  const next = parseSetupFields(changes);
  const fields = { ...base, ...next };
  if (base.features || next.features) fields.features = { ...base.features, ...next.features };
  return fields;
}

const FEATURE_COMMAND = /\b(?:turn off|turn on|without|remove|disable|enable|add|with|no)\b/g;

/** Follow-up rules run against the current draft without a server or model. */
export function applySetupRules(message: string, draft: SetupFields): { fields: SetupFields; changes: string[] } {
  const base = parseSetupFields(draft);
  const updates = setupChanges(message, FEATURE_COMMAND, 'last');
  const changes: string[] = [];
  if (updates.name && updates.name !== base.name) changes.push(`Name ${updates.name}`);
  if (updates.accent && updates.accent !== base.accent) changes.push(`Accent ${ACCENTS.find((accent) => accent.id === updates.accent)!.label}`);
  for (const [id, on] of Object.entries(updates.features ?? {})) {
    if (base.features?.[id as FeatureId] !== on) changes.push(`${featureLabel(id as FeatureId)} ${on ? 'on' : 'off'}`);
  }
  return { fields: mergeSetupFields(base, updates), changes };
}

/** Explicit on/off choices as saved overrides: unknown ids and non-booleans are dropped, and so is a value equal to its default. */
export function toOverrides(choices: Record<string, unknown>): FeatureOverrides {
  let overrides: FeatureOverrides = {};
  for (const [id, on] of Object.entries(choices)) if (isFeatureId(id) && typeof on === 'boolean') overrides = withFeature(overrides, id, on);
  return overrides;
}

/** The device settings for the event's name, colour and switches; `name` must already be a cleanName result. */
export function applyEventSetup(setup: { name: string; accent: AccentId; features: FeatureOverrides }): DeviceSettings {
  return { event: { name: setup.name, accent: setup.accent }, features: toOverrides(setup.features) };
}

/** "Back to Eventor", and a fresh install: the default name, colour and switches. */
export const defaultEventSetup = (): DeviceSettings => ({ event: null, features: {} });

/** Normalizes a stored event: data without one, or anything malformed, loads as null. */
export function storedEvent(value: unknown): DeviceSettings['event'] {
  if (!record(value)) return null;
  const name = cleanName(value.name);
  return name && isAccent(value.accent) ? { name, accent: value.accent } : null;
}
