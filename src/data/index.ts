import {
  announcements,
  event,
  goals,
  intents,
  interestGroups,
  interests,
  people,
  places,
  sessions,
  speakers,
  sponsorTiers,
  stages,
  tags,
  tracks,
} from '@/data/seed';
import { getStampTarget, listChallenges, listStampTargets, stampTargetId } from '@/data/passport';
import { NETWORKING_AREA, NETWORKING_TABLE_COUNT, networkingSlots, slotPlace } from '@/data/slots';
import type {
  Announcement,
  Event,
  Goal,
  Intent,
  Interest,
  InterestGroup,
  NetworkingSlot,
  Person,
  Place,
  Session,
  SideEvent,
  SideEventCategory,
  Speaker,
  Sponsor,
  SponsorTier,
  Stage,
  StampChallenge,
  StampKind,
  StampTarget,
  Tag,
  TicketType,
  Track,
} from '@/data/types';

export { NETWORKING_AREA, NETWORKING_TABLE_COUNT, networkingSlots, slotPlace };
export { getStampTarget, listChallenges, listStampTargets, stampTargetId };
export { getSideEvent, listSideEventCategories, listSideEvents, type SideEventFilter } from '@/data/side-events';
export { getTicketType, ticketTypes } from '@/data/tickets-seed';
export { listPitches, type Pitch } from '@/data/pitches';
export type { NetworkingSlot };
export type { SideEvent, SideEventCategory, StampChallenge, StampKind, StampTarget, TicketType };

export type SessionFilter = {
  day?: string;
  trackIds?: string[];
  tagIds?: string[];
  speakerIds?: string[];
  query?: string;
};

export function getEvent(): Event {
  return event;
}

export function listSessions(filter?: SessionFilter): Session[] {
  let result = sessions;
  if (filter?.day) result = result.filter((s) => s.dayId === filter.day);
  if (filter?.trackIds?.length) {
    result = result.filter((s) => filter.trackIds!.includes(s.trackId));
  }
  if (filter?.tagIds?.length) {
    result = result.filter((s) => s.tagIds.some((t) => filter.tagIds!.includes(t)));
  }
  if (filter?.speakerIds?.length) {
    result = result.filter((s) => s.speakerIds.some((sp) => filter.speakerIds!.includes(sp)));
  }
  if (filter?.query) {
    const q = filter.query.toLowerCase();
    result = result.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }
  return result;
}

export function getSession(id: string): Session | undefined {
  return sessions.find((s) => s.id === id);
}

export function listSpeakers(opts?: {
  query?: string;
  sort?: 'default' | 'name' | 'company';
}): Speaker[] {
  let result = speakers;
  if (opts?.query) {
    const q = opts.query.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q),
    );
  }
  if (opts?.sort === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
  if (opts?.sort === 'company')
    result = [...result].sort((a, b) => a.company.localeCompare(b.company));
  return result;
}

export function getSpeaker(id: string): Speaker | undefined {
  return speakers.find((s) => s.id === id);
}

export function listSponsors(opts?: { tierId?: string; query?: string }): SponsorTier[] {
  let tiers = sponsorTiers.filter((t) => t.sponsors.length > 0);
  if (opts?.tierId) tiers = tiers.filter((t) => t.id === opts.tierId);
  if (opts?.query) {
    const q = opts.query.toLowerCase();
    tiers = tiers
      .map((t) => ({
        ...t,
        sponsors: t.sponsors.filter(
          (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
        ),
      }))
      .filter((t) => t.sponsors.length > 0);
  }
  return tiers;
}

export function getSponsor(id: string): Sponsor | undefined {
  for (const tier of sponsorTiers) {
    const sponsor = tier.sponsors.find((s) => s.id === id);
    if (sponsor) return sponsor;
  }
  return undefined;
}

export function listPeople(
  query?: string,
  filter?: { interestIds?: string[]; goalIds?: string[] },
): Person[] {
  let result = people;
  if (filter?.interestIds?.length) {
    result = result.filter((p) =>
      p.selections.some((s) => filter.interestIds!.includes(s.interestId)),
    );
  }
  if (filter?.goalIds?.length) {
    result = result.filter((p) => p.selections.some((s) => filter.goalIds!.includes(s.goalId)));
  }
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.intro.toLowerCase().includes(q) ||
        p.industry.toLowerCase().includes(q),
    );
  }
  return result;
}

export function getPerson(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

export function listPlaces(query?: string): Place[] {
  if (!query) return places;
  const q = query.toLowerCase();
  return places.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
}

export function listAnnouncements(): Announcement[] {
  return [...announcements].sort((a, b) => b.date.localeCompare(a.date));
}

export function search(query: string): {
  people: Person[];
  sessions: Session[];
  speakers: Speaker[];
  sponsors: Sponsor[];
} {
  if (!query.trim()) {
    return { people: [], sessions: [], speakers: [], sponsors: [] };
  }
  const q = query.toLowerCase();
  return {
    people: listPeople(query),
    sessions: listSessions({ query }),
    speakers: listSpeakers({ query }),
    sponsors: sponsorTiers
      .flatMap((t) => t.sponsors)
      .filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      ),
  };
}

export function listTracks(): Track[] {
  return tracks;
}

export function listTags(): Tag[] {
  return tags;
}

export function listStages(): Stage[] {
  return stages;
}

export function listInterestGroups(): InterestGroup[] {
  return interestGroups;
}

export function listIntents(): Intent[] {
  return intents;
}

export function listGoals(): Goal[] {
  return goals;
}

export function getGoal(id: string): Goal | undefined {
  return goals.find((g) => g.id === id);
}

export function listInterests(): Interest[] {
  return interests;
}

export function listSlots(day: string): NetworkingSlot[] {
  return networkingSlots(day);
}

export function getInterest(id: string): Interest | undefined {
  return interests.find((i) => i.id === id);
}
