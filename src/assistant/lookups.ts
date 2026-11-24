import { entities, entityUrls, lookupResponse, type Entity } from '@/assistant/catalog';
import { genericLinkType, LINK_WORDS, namesEventThing, normalizeIntent, onlyEventWords } from '@/assistant/scope';
import type { AskResponse } from '@/lib/assistant-contract';

const LINK_WORD = new RegExp(`\\b(${LINK_WORDS.join('|')})\\b`);
const LINK_QUESTION_WORDS = new Set([...`
  what s is are the a an which where can could would you tell know do does i find get please give me show list
  of for to on and or profile have has with`.split(/\s+/).filter(Boolean), ...LINK_WORDS]);

// A named entity's links: once the names are removed, only link words and question words are left.
function asksNamedLinks(q: string, matched: Entity[]): boolean {
  const withoutNames = matched.flatMap((e) => e.aliases).sort((a, b) => b.length - a.length)
    .reduce((text, alias) => text.replace(normalizeIntent(alias), ' '), q);
  return LINK_WORD.test(q) && withoutNames.trim().split(/\s+/).every((word) => LINK_QUESTION_WORDS.has(word));
}

export function linksAnswer(question: string, matched: Entity[]): AskResponse | null {
  const clause = question.split(/[?!;\n]/)[0];
  const q = normalizeIntent(clause);
  const category = genericLinkType(clause);
  if (!category && !asksNamedLinks(q, matched)) return null;
  const requested = [
    ...(/\bwebsites?\b/.test(q) ? ['website'] : []),
    ...(/\b(linkedin|socials?)\b/.test(q) ? ['linkedin'] : []),
    ...(/\b(instagram|socials?)\b/.test(q) ? ['instagram'] : []),
  ];
  if (!requested.length) requested.push('website', 'linkedin', 'instagram');
  const selected = category
    ? entities.filter((e) => e.source.type === category && Object.entries(e.links).some(([key, url]) => requested.includes(key) && url))
    : matched.filter((e) => e.source.type !== 'place').slice(0, 5);
  const lines = selected.map((e) => {
    const links = Object.entries(e.links)
      .filter(([key, url]) => requested.includes(key) && url && entityUrls(e).includes(url))
      .map(([key, url]) => `${key === 'linkedin' ? 'LinkedIn' : key === 'instagram' ? 'Instagram' : 'Website'}: ${url}`);
    if (links.length) return `${e.source.title}: ${links.join(', ')}`;
    const identity = e.source.type === 'person' ? e.facts[0]
      : e.source.type === 'pitch' ? e.facts[1] ?? e.facts[0]
      : e.source.title + '.';
    return `${identity} No ${requested.length === 1 ? requested[0] + ' ' : ''}link was provided.`;
  });
  const none = category ? 'No provided links match that request.' : 'Please name an event entity to look up its provided links.';
  return lookupResponse(lines.join('\n') || none, selected);
}

// "Which startups are pitching?", "who is pitching", "list the pitches": the startup lineup, from the data, no model.
// Lexical retrieval misses this because the pitch facts never say the word "pitching"; a named startup keeps its summary.
const PITCH_LIST = /\b(startups?|founders?|pitch(?:es|ing)?)\b/;
// "which talks are about AI and startups" asks about sessions, not the lineup: leave those to retrieval.
const PITCH_TOPIC = /\b(talks?|sessions?|panels?|keynotes?|workshops?|about|funding)\b/;
export function pitchesAnswer(question: string, matched: Entity[]): AskResponse | null {
  const q = normalizeIntent(question);
  if (!PITCH_LIST.test(q) || PITCH_TOPIC.test(q) || matched.some((e) => e.source.type === 'pitch')) return null;
  const pitches = entities.filter((e) => e.source.type === 'pitch');
  return pitches.length ? lookupResponse(pitches.map((e) => e.facts[0]).join('\n'), pitches) : null;
}

export function venueAnswer(question: string, matched: Entity[]): AskResponse | null {
  const q = normalizeIntent(question);
  const venue = /\b(venue|festival|eventor)\b/.test(q);
  // "What time does the venue open" is a calendar question; "where", "located" or "directions" ask for a place.
  const asksPlace = /\b(where|address|location|located|locate|directions|held)\b/.test(q);
  if (!asksPlace && !(venue && !/\b(when|time|start|begin|opens?|end|finish|close)\b/.test(q))) return null;
  const selected = matched.filter((e) => e.venue || e.source.id === 'main-venue').slice(0, 5);
  if (selected.length) {
    const lines = selected.map((e) => e.venue ? `${e.source.title}: ${e.venue}. Open the Map tab for its location.` : e.facts.join(' '));
    return lookupResponse(lines.join('\n'), selected);
  }
  if (matched.length) return lookupResponse('No venue location was provided for that entity. Open the Map tab for event places.', matched);
  // The main venue does not answer "where is the closing party" or "where is the opening ceremony".
  if (namesEventThing(q) || (!venue && !onlyEventWords(q))) return null;
  const main = entities.find((e) => e.source.id === 'main-venue');
  return lookupResponse(main?.facts.join(' ') ?? '', main ? [main] : []);
}
