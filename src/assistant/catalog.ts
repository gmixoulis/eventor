import {
  getEvent, getPerson, listPeople, listPitches, listPlaces, listSessions,
  listSideEvents, listSpeakers, listSponsors, listTracks,
} from '@/data';
import { sessionToItem, sideEventToItem, type AgendaItem } from '@/lib/agenda-item';
import type { AskResponse, AskSource } from '@/lib/assistant-contract';
import { formatFullDay, formatTime, parseDay } from '@/lib/format';

export type Entity = {
  source: AskSource;
  aliases: string[];
  facts: string[];
  links: Partial<Record<'website' | 'linkedin' | 'instagram', string>>;
  venue?: string;
  agenda?: AgendaItem;
  speakers?: string[];
};

export function scheduleFact(item: AgendaItem): string {
  const time = `${formatTime(item.startTime, true)} to ${formatTime(item.endTime, true)}`;
  const { short, day, month } = parseDay(item.day);
  return `**${item.title}**, ${short} ${day} ${month.slice(0, 3)}, ${time}, ${item.place}`;
}

function entity(type: AskSource['type'], id: string, title: string, facts: string[]): Entity {
  return { source: { type, id, title }, aliases: [title], facts, links: {} };
}

export const entities: Entity[] = [
  ...listSessions().map((session) => {
    const item = sessionToItem(session);
    const speakers = listSpeakers().filter((speaker) => session.speakerIds.includes(speaker.id));
    const track = listTracks().find((candidate) => candidate.id === session.trackId);
    return {
      ...entity('session', session.id, session.title, [
        scheduleFact(item),
        `${session.title}: ${session.description}`,
        `${session.title} features ${speakers.map((s) => s.name).join(', ')}${track ? ` in the ${track.name} track` : ''}.`,
      ]),
      agenda: item, venue: item.place, speakers: speakers.map((s) => s.name),
      links: { website: session.url },
    };
  }),
  ...listSideEvents().map((side) => {
    const item = sideEventToItem(side);
    return {
      ...entity('sideEvent', side.id, side.title, [
        scheduleFact(item),
        `${side.title}: ${side.description}`,
        `${side.title} is hosted by ${side.host} at ${side.venueName}, ${side.area}.`,
      ]),
      aliases: [side.title, side.venueName], agenda: item,
      venue: `${side.venueName}, ${side.area}`, links: { website: side.url },
    };
  }),
  ...listSpeakers().map((speaker) => ({
    ...entity('speaker', speaker.id, speaker.name, [
      `${speaker.name} is ${speaker.title} at ${speaker.company}.`,
      ...(speaker.bio ? [`${speaker.name}: ${speaker.bio}`] : []),
    ]),
    links: { linkedin: speaker.linkedin },
  })),
  ...listSponsors().flatMap((tier) => tier.sponsors).map((sponsor) => ({
    ...entity('sponsor', sponsor.id, sponsor.name, [`${sponsor.name}: ${sponsor.description}`]), links: sponsor.links,
  })),
  ...listPeople().map((person) => ({
    ...entity('person', person.id, person.name, [
      `${person.name} is ${person.title} at ${person.company}.`,
      `${person.name}: ${person.intro}`,
    ]),
    aliases: [person.name, person.company],
  })),
  ...listPitches().map((pitch) => {
    const founder = getPerson(pitch.founderId);
    return entity('pitch', pitch.id, pitch.startup, [
      `${pitch.startup}: ${pitch.pitch}`,
      ...(founder ? [`${founder.name} is ${founder.title} at ${founder.company}.`, `${pitch.startup}: ${founder.intro}`] : []),
      ...listSessions({ query: pitch.startup }).map((session) => scheduleFact(sessionToItem(session))),
    ]);
  }),
  ...listPlaces().map((place) => ({
    ...entity('place', place.id, place.name, [`${place.name}: ${place.description}`]),
    venue: `${place.name}. ${place.description} Open the Map tab to locate it`,
  })),
  {
    ...entity('place', 'main-venue', 'Eventor Center', [
      `${getEvent().name} takes place at Eventor Center.`,
      'No street address was provided; open the Map tab for its location.',
    ]),
    aliases: ['Eventor Center', 'Eventor Center', 'Eventor', getEvent().name],
  },
  ...getEvent().days.map((day) => entity('day', day, formatFullDay(day), [
    ...listSessions({ day }).map((session) => scheduleFact(sessionToItem(session))),
    ...listSideEvents({ day }).map((side) => scheduleFact(sideEventToItem(side))),
  ])),
];

export const summaryTargets = entities.filter((e) => ['pitch', 'session', 'sideEvent', 'sponsor', 'day'].includes(e.source.type));
export const entityKey = (e: Entity): string => `${e.source.type}:${e.source.id}`;
export const entityUrls = (e: Entity): string[] => Object.values(e.links).filter((url): url is string => Boolean(url));
export const agenda = entities.flatMap((e) => e.agenda ? [e.agenda] : []);

/** One source per entity, at most five. */
export function sourcesFor(used: Entity[]): AskSource[] {
  return [...new Map(used.map((entity) => [entityKey(entity), entity.source])).values()].slice(0, 5);
}

/** An answer from the data with no model: duplicate lines dropped, after an optional lead such as the clamp clause. */
export function lookupResponse(answer: string, used: Entity[], lead = ''): AskResponse {
  return { answer: (lead ? `${lead.trimEnd()}\n` : '') + [...new Set(answer.split('\n'))].join('\n'), kind: 'lookup', sources: sourcesFor(used) };
}
