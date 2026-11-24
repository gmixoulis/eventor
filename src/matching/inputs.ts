import type { Meeting, Profile } from '@/backend/types';
import { getInterest, listPeople } from '@/data';
import type { MatchProfile, Selection } from '@/matching/types';

export type MatchProfileSource = {
  id: string;
  selections: Selection[];
  intro: string;
  title: string;
  company: string;
  industry: string;
};

export function profileText(source: MatchProfileSource): string {
  const interestNames = source.selections
    .map((selection) => getInterest(selection.interestId)?.name)
    .filter((name) => name !== undefined);
  return [source.intro, source.title, source.company, source.industry, ...interestNames]
    .filter((part) => part.trim() !== '')
    .join(' ');
}

export function toMatchProfile(person: {
  id: string;
  intro: string;
  title: string;
  company: string;
  industry: string;
  role?: string;
  selections: Selection[];
  lastActiveAt: string;
}): MatchProfile {
  return {
    id: person.id,
    selections: person.selections,
    text: profileText(person),
    industry: person.industry,
    role: person.role,
    lastActiveAt: person.lastActiveAt,
    acceptedMeetings: 0,
    staleRequests: 0,
    freeSlotRatio: 1,
  };
}

export function buildOthers(): MatchProfile[] {
  return listPeople().map(toMatchProfile);
}

export function freeSlotRatio(
  availability: string[],
  meetings: { start: string; status: string }[],
): number {
  if (availability.length === 0) return 1;
  const occupied = new Set(
    meetings
      .filter((meeting) => meeting.status !== 'declined')
      .map((meeting) => `${meeting.start.slice(0, 13)}:00`),
  );
  const free = availability.filter((slot) => !occupied.has(slot)).length;
  return free / availability.length;
}

export function isStaleRequest(createdAt: string, now: Date): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now.getTime() - created > 5 * 60 * 60 * 1000;
}

/** The signed-in person's match profile, from their profile and meetings. */
export function buildMe(profile: Profile, meetings: Meeting[]): MatchProfile {
  const now = new Date();
  return {
    id: profile.id,
    selections: profile.selections,
    text: profileText(profile),
    industry: profile.industry,
    role: profile.role,
    availability: profile.availability,
    acceptedMeetings: meetings.filter((m) => m.status === 'accepted').length,
    staleRequests: meetings.filter(
      (m) =>
        m.direction === 'inbound' && m.status === 'pending' && isStaleRequest(m.createdAt, now),
    ).length,
    freeSlotRatio: freeSlotRatio(profile.availability, meetings),
  };
}
