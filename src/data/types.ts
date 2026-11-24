export type Event = {
  id: string;
  name: string;
  days: string[];
  timezone: string;
};

export type Day = {
  id: string;
  date: string;
  weekday: string;
  label: string;
};

export type Stage = {
  id: string;
  name: string;
  order: number;
};

export type Track = {
  id: string;
  name: string;
};

export type Tag = {
  id: string;
  name: string;
};

export type Speaker = {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  photo?: string;
  linkedin?: string;
  featured?: boolean;
};

export type Session = {
  id: string;
  title: string;
  description: string;
  dayId: string;
  stageId: string;
  startTime: string;
  endTime: string;
  speakerIds: string[];
  trackId: string;
  tagIds: string[];
  url?: string;
  allDay?: boolean;
  /** Seats in the smaller rooms; absent means the room is not reservable. */
  capacity?: number;
};

export type SponsorTier = {
  id: string;
  name: string;
  order: number;
  sponsors: Sponsor[];
};

export type Sponsor = {
  id: string;
  name: string;
  tierId: string;
  description: string;
  interestIds: string[];
  links: {
    website?: string;
    linkedin?: string;
    instagram?: string;
  };
  logo?: string;
  team: string[];
};

export type NetworkingSlot = {
  id: string;
  day: string;
  start: string;
  end: string;
};

export type Intent = {
  id: 'networking' | 'trading' | 'investment' | 'recruitment' | 'mentoring';
  name: string;
};

export type Goal = {
  id: string;
  intentId: Intent['id'];
  label: string;
  /** Shown after an interest's name; empty for networking. */
  shortLabel: string;
  pairsWith: string;
};

export type Interest = {
  id: string;
  name: string;
  categoryId: string;
  intents: Intent['id'][];
};

export type Selection = {
  interestId: string;
  goalId: string;
};

export type Person = {
  id: string;
  name: string;
  role: 'Startup' | 'Investor' | 'Corporate' | 'Media';
  title: string;
  company: string;
  intro: string;
  industry: string;
  countries: string[];
  selections: Selection[];
  lastActiveAt: string;
};

export type Place = {
  id: string;
  name: string;
  /** Drives the map colour and block size. */
  category: 'stage' | 'lounge' | 'service';
  x: number;
  y: number;
  description: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

export type SideEventCategory = 'Party' | 'Workshop' | 'Meetup' | 'Talk' | 'Exhibition';

export type SideEvent = {
  id: string;
  title: string;
  host: string;
  category: SideEventCategory;
  venueName: string;
  area: string;
  lat: number;
  lng: number;
  day: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  description: string;
  interestIds: string[];
  trackId?: string;
  url?: string;
};

export type TicketType = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
};

export type StampKind = 'place' | 'sponsor' | 'side-event';

export type StampTarget = {
  id: string;
  kind: StampKind;
  refId: string;
  title: string;
  points: number;
};

export type StampChallengeRule = { kind: StampKind | 'any'; count: number };

export type StampChallenge = {
  id: string;
  title: string;
  description: string;
  rule: StampChallengeRule;
  bonus: number;
};

export type InterestGroup = {
  id: string;
  name: string;
  interests: Interest[];
};
