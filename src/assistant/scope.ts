import { getEvent, listSessions, listTracks } from '@/data';
import { entities, type Entity } from '@/assistant/catalog';
import { parseDay } from '@/lib/format';

export const REFUSAL =
  'I can help with Eventor 2027: the schedule, speakers, sponsors, startups, side events and venue. Try one of these:';

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const INTENT_SYNONYMS: Record<string, string> = {};

const wordSet = (words: string): Set<string> => new Set(words.split(/\s+/).filter(Boolean));
export const EVENT_WEEKDAYS = getEvent().days.map((day) => normalize(parseDay(day).weekday));
// The festival itself and the things at it: these count anywhere in a question.
const FESTIVAL_NOUNS = wordSet('venue venues festival eventor schedule programme agenda lineup conference');
const THING_NOUNS = wordSet(`
  session sessions talk talks panel panels keynote keynotes workshop workshops speaker speakers speaking
  sponsor sponsors startup startups pitch pitches pitching registration ceremony meetup networking`);
// Nouns that often name something else (a political party, a coding program, a disease stage) and
// time and place words: these count only in a clause with no other subject (see inScope).
const LOOSE_THINGS = wordSet(`
  party parties ticket tickets badge badges stage stages room rooms hall halls
  speak speaks presenting presentation presentations`);
const LOOSE_WORDS = new Set([...wordSet(`
  event events program programs map doors plan plans activities
  now next after later soon today tonight tomorrow morning afternoon evening night day days
  start starts begin begins end ends finish finishes open opens opening close closes closing over ended
  when time times happening where located location held directions address`), ...EVENT_WEEKDAYS]);
const FILLERS = wordSet(`
  a an the this that these those it its is are am was were be been will would could can may might shall should
  do does did has have had there here i me my we us our you your what whats which who whos whom whose how why
  of for in on at to from by with about around near into and or then also so s re ll d m t ve
  please thanks thank hi hello hey excuse sorry tell show list give find know let see get go going want like need
  just still any anything something some all every everything else other more much many main first last again
  currently right exactly help check attend attending summarize summarise summary whole full entire
  coming playing taking take place up ok okay side buy pick collect`);
const QUESTION_WORDS = wordSet('who whos what whats which where when how why');
const EVENT_WORDS = new Set([...FESTIVAL_NOUNS, ...THING_NOUNS, ...LOOSE_THINGS, ...LOOSE_WORDS]);
const THINGS = new Set([...THING_NOUNS, ...LOOSE_THINGS]);
/** Words that ask for a provided link (lookups.ts answers these). */
export const LINK_WORDS = ['website', 'websites', 'link', 'links', 'url', 'urls', 'linkedin', 'instagram', 'social', 'socials'];
// Words an attendee uses about the event that do not by themselves make a question about it.
const EVENT_TERMS = new Set([...LINK_WORDS, 'wifi']);
const KNOWN = new Set([
  ...EVENT_WORDS, ...FILLERS, ...EVENT_TERMS,
  ...entities.flatMap((e) => [...e.aliases, ...e.facts]).flatMap((text) => normalize(text).split(' ')),
]);
const TYPO_TARGETS = [...EVENT_WORDS].filter((word) => word.length >= 5);

// Tasks outside the event, refused even when an event word comes along ("a poem for the keynote").
// Matched on normalize(question). Topic words the event data itself uses (health, legal, coding, stories)
// are left out, so "Is there a healthtech session?" still passes.
const OUTSIDE_TASKS = [
  /\b(pain(?! points?)|fever|sick|symptoms?|medicines?|medications?|pills?|dosage|diagnos\w*|prescri\w*|(health|medical) advice)\b/,
  /\b(elections?|electoral|political|politics|politicians?|referendum|parliament)\b/,
  /\b(legal advice|lawyers?|attorneys?|lawsuits?|sue|illegal|is (it|this) legal)\b/,
  /\b(bitcoin|btc|ethereum|crypto\w*|forex|currenc(y|ies)|exchange rates?|(stock|share) (prices?|markets?)|in (dollars|euros|pounds))\b/,
  /\b(weather|forecast|temperatures?|(will|is) it (rain|raining|snow|snowing|sunny|hot|cold))\b/,
  /\b(cover letters?|essays?|poems?|poetry|lyrics|homework|(write|compose|make up|tell)( me)? an? (\w+ )?(story|song))\b/,
  /\b(python|javascript|typescript|sql|regex|html|css|debug\w*|source code)\b/,
  /\b(write|fix)( me)?( a| an| this| my)? (\w+ )?(code|function|script|program|bug|error)\b/,
  /\b(translate|translating|translation of)\b/,
  /\b(jokes?|riddles?)\b/,
  /\b(system prompt|(system|developer) (message|instructions)|your (system )?(prompt|instructions|rules|guidelines))\b/,
];

// One insertion, deletion, substitution or adjacent transposition, only for longer words.
function nearWord(a: string, b: string, minLength = 5): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < minLength || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// Fixes a one-letter slip in an event word ("venu", "whre"); never rewrites a word the gate or the event data knows.
function fixTypo(word: string): string {
  return KNOWN.has(word) ? word : TYPO_TARGETS.find((target) => nearWord(word, target, 4)) ?? word;
}

export function normalizeIntent(question: string, fixTypos = true): string {
  const words = normalize(question)
    .replace(/(?<!\S)(\S+)(?!\S)/g, (word) => INTENT_SYNONYMS[word] ?? word)
    .split(' ');
  return (fixTypos ? words.map(fixTypo) : words).join(' ')
    .replace(/\bhow (?:(?:do|can|to|should|would) )?(?:i |we )?get\b/g, 'directions');
}

// True when the text has an event word and every other word is an event word, a filler or a number.
export function onlyEventWords(text: string): boolean {
  const words = normalizeIntent(text).split(' ').filter(Boolean);
  return words.some((word) => EVENT_WORDS.has(word)) &&
    words.every((word) => EVENT_WORDS.has(word) || FILLERS.has(word) || /^\d+$/.test(word));
}

// A capitalised word inside a sentence that the event data does not know names an outside company or
// person ("Apple", "Elon Musk"). Acronyms (ATM, IBM) are skipped; "OpenAI" and "Google" are in the data.
function namesOutsider(question: string): boolean {
  return question.split(/[.!?;:\n]/).some((clause) => clause.trim().split(/\s+/).slice(1).some((word) =>
    /^\p{Lu}/u.test(word) && word !== word.toUpperCase() &&
    normalizeIntent(word).split(' ').some((part) => part && !KNOWN.has(part))));
}

// True when the text names a thing at the festival (a talk, a party, a sponsor) rather than the festival or a day.
export function namesEventThing(text: string): boolean {
  const q = normalizeIntent(text);
  return /\bside events?\b/.test(q) || q.split(' ').some((word) => THINGS.has(word));
}

// A festival or event-thing noun typed as such, with no typo fixing: "venue", "speakers", "pitch".
function namesEventNoun(text: string): boolean {
  const exact = normalizeIntent(text, false);
  return /\bside events?\b/.test(exact) || exact.split(' ').some((word) => FESTIVAL_NOUNS.has(word) || THING_NOUNS.has(word));
}

// A clause that asks about something that is not an event word ("Who is the CEO of Google").
function asksElsewhere(clause: string): boolean {
  const words = normalizeIntent(clause).split(' ');
  return words.some((word) => QUESTION_WORDS.has(word)) && !namesEventNoun(clause) && words.some((word) =>
    word && !EVENT_WORDS.has(word) && !FILLERS.has(word) && !EVENT_TERMS.has(word) && !/^\d+$/.test(word));
}

const LINK_CATEGORIES: Record<string, Entity['source']['type']> = {
  sponsor: 'sponsor', sponsors: 'sponsor', companies: 'sponsor', session: 'session', sessions: 'session',
  'side event': 'sideEvent', 'side events': 'sideEvent', speaker: 'speaker', speakers: 'speaker',
};
const CATEGORY = '(sponsors?|companies|sessions?|side events?|speakers?)';
const LINKS = `(?:${LINK_WORDS.join('|')})(?: (?:or|and) (?:linkedin|instagram))?`;
const CATEGORY_LINKS = new RegExp(
  `^(?:(?:which|what|list|show|show me) )?(?:(?:the|all|our|event|festival) )*${CATEGORY}` +
  `(?: (?:have|has|with|are on|on))?(?: (?:a|their))? ${LINKS}$`);
const LINKS_OF_CATEGORY = new RegExp(`^${LINKS}(?: (?:for|of))? ${CATEGORY}$`);

/** The entity type a "which sponsors have a website" question lists, if the question is one. */
export function genericLinkType(question: string): Entity['source']['type'] | undefined {
  const q = normalizeIntent(question);
  const match = CATEGORY_LINKS.exec(q) ?? LINKS_OF_CATEGORY.exec(q);
  return match ? LINK_CATEGORIES[match[1]] : undefined;
}

/** The event day an ISO date in the question names ("2026-05-28"). */
export function eventDayIn(question: string): string | undefined {
  return getEvent().days.find((day) => question.includes(day));
}

function mentions(question: string, alias: string): boolean {
  const words = normalize(question).split(' ');
  const name = normalize(alias).split(' ');
  return words.some((_, i) => name.every((word, j) => nearWord(word, words[i + j] ?? '')));
}

export function matchEntities(question: string): Entity[] {
  const direct = entities.filter((e) => e.source.type !== 'day' && e.aliases.some((alias) => mentions(question, alias)))
    .sort((a, b) => Math.max(...b.aliases.map((s) => s.length)) - Math.max(...a.aliases.map((s) => s.length)));
  if (direct.length) return direct;
  const trackQuestion = question.split(/[;.!?\n]/).filter((clause) => !/^(?:system\s*:|you are now\b)/i.test(clause.trim())).join(' ');
  const tracks = listTracks().filter((track) => mentions(trackQuestion, track.name));
  const sessions = listSessions().filter((session) => tracks.some((track) => track.id === session.trackId));
  return entities.filter((e) => e.source.type === 'session' && sessions.some((session) => session.id === e.source.id));
}

export function inScope(question: string, matched = matchEntities(question)): boolean {
  const text = normalize(question);
  // Outside tasks and outside names are refused first, even next to an event name ("Coca-Cola at Eventor").
  if (OUTSIDE_TASKS.some((task) => task.test(text)) || namesOutsider(question)) return false;
  if (matched.length || genericLinkType(question) || eventDayIn(question)) return true;
  // The rule: a festival or event-thing noun typed as such ("venue", "speakers", "pitch") admits the question
  // wherever it stands, unless another clause asks about something else ("Who is the CEO of Google? Asking
  // for the conference"). Time and place words ("today", "now", "where"), loose nouns and typo fixes also fit
  // outside questions, so they admit only a clause with no other subject: "what's on today" passes,
  // "what is the bitcoin price today" and "where is Google" do not.
  if (namesEventNoun(question)) return !question.split(/[.!?;\n]/).some(asksElsewhere);
  return question.split(/[;,.!?\n]/).some(onlyEventWords);
}
