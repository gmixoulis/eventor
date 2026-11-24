import speakersJson from '@/data/speakers.json';
import type {
  Announcement,
  Day,
  Event,
  Goal,
  Intent,
  Interest,
  InterestGroup,
  Person,
  Place,
  Selection,
  Session,
  Speaker,
  SponsorTier,
  Stage,
  Tag,
  Track,
} from '@/data/types';

// ---------------------------------------------------------------------------
// Sample content. All names, descriptions, bios and announcements are original
// placeholder text; real artwork, photos and logos are dropped in later.
// ---------------------------------------------------------------------------

export const event: Event = {
  id: 'eventor',
  name: 'Eventor Summit',
  days: ['2026-05-27', '2026-05-28', '2026-05-29'],
  timezone: 'America/New_York',
};

export const days: Day[] = [
  { id: '2026-05-27', date: '2026-05-27', weekday: 'Wednesday', label: 'Wed, May 27' },
  { id: '2026-05-28', date: '2026-05-28', weekday: 'Thursday', label: 'Thu, May 28' },
  { id: '2026-05-29', date: '2026-05-29', weekday: 'Friday', label: 'Fri, May 29' },
];

export const stages: Stage[] = [
  { id: 'stage-hudson', name: 'Hudson Hall', order: 1 },
  { id: 'stage-chelsea', name: 'Chelsea Pavilion', order: 2 },
  { id: 'stage-cinema', name: 'Tribeca Theater', order: 3 },
  { id: 'stage-side', name: 'Side Events', order: 4 },
];

export const tracks: Track[] = [
  { id: 'track-ai', name: 'AI' },
  { id: 'track-fintech', name: 'Fintech' },
  { id: 'track-culture', name: 'Culture' },
  { id: 'track-startups', name: 'Startups' },
];

export const tags: Tag[] = [
  { id: 'tag-keynote', name: 'Keynote' },
  { id: 'tag-panel', name: 'Panel' },
  { id: 'tag-workshop', name: 'Workshop' },
  { id: 'tag-fireside', name: 'Fireside Chat' },
  { id: 'tag-lightning', name: 'Lightning Talk' },
];

export const speakers: Speaker[] = speakersJson;

export const sessions: Session[] = [
  // Day one: 2026-05-27
  {
    id: 's-opening',
    title: 'Opening Ceremony & Welcome',
    description: 'A kickoff for the summit: what to expect across three days and how to make the most of the venues.',
    dayId: '2026-05-27',
    stageId: 'stage-hudson',
    startTime: '09:00',
    endTime: '09:30',
    speakerIds: ['sp-019'],
    trackId: 'track-startups',
    tagIds: ['tag-keynote'],
  },
  {
    id: 's-ai-future-work',
    title: 'AI and the Future of Work',
    description: 'How AI assistants are reshaping every role, and where founders should place their bets over the next three years.',
    dayId: '2026-05-27',
    stageId: 'stage-chelsea',
    startTime: '09:45',
    endTime: '10:30',
    speakerIds: ['sp-053'],
    trackId: 'track-ai',
    tagIds: ['tag-keynote'],
  },
  {
    id: 's-deep-tech',
    title: 'Building Deep Tech in New York',
    description: 'What it takes to run a research-heavy startup in the city, from hiring to compute budgets.',
    dayId: '2026-05-27',
    stageId: 'stage-cinema',
    startTime: '10:00',
    endTime: '10:20',
    speakerIds: ['sp-006'],
    trackId: 'track-ai',
    tagIds: ['tag-lightning'],
    capacity: 30,
  },
  {
    id: 's-lab-to-product',
    title: 'From Lab to Product: The Company 2 Story',
    description: 'A conversation on turning bleeding-edge research into a product customers actually pay for.',
    dayId: '2026-05-27',
    stageId: 'stage-hudson',
    startTime: '11:00',
    endTime: '11:45',
    speakerIds: ['sp-006', 'sp-019'],
    trackId: 'track-ai',
    tagIds: ['tag-fireside'],
  },
  {
    id: 's-voice-interface',
    title: 'Voice Is the Next Interface',
    description: 'How synthetic voice is moving from a novelty to the default way we talk to the software around us.',
    dayId: '2026-05-27',
    stageId: 'stage-chelsea',
    startTime: '11:30',
    endTime: '12:00',
    speakerIds: ['sp-001'],
    trackId: 'track-ai',
    tagIds: ['tag-keynote'],
  },
  {
    id: 's-fintech-after-boom',
    title: 'Fintech After the Boom',
    description: 'What the next wave of financial infrastructure looks like now that cheap capital is gone.',
    dayId: '2026-05-27',
    stageId: 'stage-cinema',
    startTime: '13:00',
    endTime: '13:30',
    speakerIds: ['sp-004', 'sp-003'],
    trackId: 'track-fintech',
    tagIds: ['tag-panel'],
    capacity: 40,
  },
  {
    id: 's-scaling-borders',
    title: 'Scaling Across Borders',
    description: 'Lessons from building a payroll platform that works in every country, not just the easy ones.',
    dayId: '2026-05-27',
    stageId: 'stage-hudson',
    startTime: '14:00',
    endTime: '14:45',
    speakerIds: ['sp-004'],
    trackId: 'track-fintech',
    tagIds: ['tag-keynote'],
  },
  {
    id: 's-mobility-city-scale',
    title: 'Mobility at City Scale',
    description: 'A fireside chat on running a transport network across dozens of cities at once.',
    dayId: '2026-05-27',
    stageId: 'stage-chelsea',
    startTime: '15:30',
    endTime: '16:15',
    speakerIds: ['sp-005'],
    trackId: 'track-startups',
    tagIds: ['tag-fireside'],
  },

  // Day two: 2026-05-28
  {
    id: 's-creative-ai-renaissance',
    title: 'The Creative AI Renaissance',
    description: 'Why generative video is opening a new market for creators, and what that means for every studio.',
    dayId: '2026-05-28',
    stageId: 'stage-hudson',
    startTime: '09:30',
    endTime: '10:00',
    speakerIds: ['sp-007'],
    trackId: 'track-ai',
    tagIds: ['tag-keynote'],
  },
  {
    id: 's-what-vcs-want',
    title: 'What VCs Want in 2026',
    description: 'Two investors on the metrics, narratives and teams that are getting funded this year.',
    dayId: '2026-05-28',
    stageId: 'stage-chelsea',
    startTime: '10:15',
    endTime: '11:00',
    speakerIds: ['sp-003', 'sp-010'],
    trackId: 'track-startups',
    tagIds: ['tag-panel'],
  },
  {
    id: 's-hiring-first-ten',
    title: 'Hiring Your First Ten',
    description: 'How to hire the small team that defines whether your company compounds or stalls.',
    dayId: '2026-05-28',
    stageId: 'stage-cinema',
    startTime: '11:00',
    endTime: '11:25',
    speakerIds: ['sp-004'],
    trackId: 'track-startups',
    tagIds: ['tag-lightning'],
    capacity: 25,
  },
  {
    id: 's-runway-new-studio',
    title: 'Company 6 and the New Studio',
    description: 'A hands-on look at how AI tools fit into a modern film and video production pipeline.',
    dayId: '2026-05-28',
    stageId: 'stage-hudson',
    startTime: '11:45',
    endTime: '12:30',
    speakerIds: ['sp-007'],
    trackId: 'track-ai',
    tagIds: ['tag-workshop'],
  },
  {
    id: 's-city-to-world',
    title: 'From New York to the World',
    description: 'How founders from smaller markets build companies with global reach from day one.',
    dayId: '2026-05-28',
    stageId: 'stage-chelsea',
    startTime: '13:00',
    endTime: '13:45',
    speakerIds: ['sp-005', 'sp-019'],
    trackId: 'track-culture',
    tagIds: ['tag-fireside'],
  },
  {
    id: 's-openai-for-startups',
    title: 'Company 7 for Startups',
    description: 'A working session on shipping with frontier models, from fine-tuning to production guardrails.',
    dayId: '2026-05-28',
    stageId: 'stage-cinema',
    startTime: '14:30',
    endTime: '15:00',
    speakerIds: ['sp-010'],
    trackId: 'track-ai',
    tagIds: ['tag-workshop'],
    capacity: 45,
  },
  {
    id: 's-startup-moment',
    title: 'The New York Startup Moment',
    description: 'A panel on why New York keeps attracting founders and capital.',
    dayId: '2026-05-28',
    stageId: 'stage-hudson',
    startTime: '15:30',
    endTime: '16:15',
    speakerIds: ['sp-019', 'sp-005'],
    trackId: 'track-culture',
    tagIds: ['tag-panel'],
  },
  {
    id: 's-microsoft-playbook',
    title: "Sponsor 7's Startup Playbook",
    description: 'How one of the largest cloud platforms thinks about partnering with early-stage companies.',
    dayId: '2026-05-28',
    stageId: 'stage-chelsea',
    startTime: '16:30',
    endTime: '17:00',
    speakerIds: ['sp-053'],
    trackId: 'track-startups',
    tagIds: ['tag-fireside'],
  },

  // Day three: 2026-05-29
  {
    id: 's-deep-tech-frontiers',
    title: 'Deep Tech Frontiers',
    description: 'Two technical founders on the research problems that will define the next decade.',
    dayId: '2026-05-29',
    stageId: 'stage-hudson',
    startTime: '09:30',
    endTime: '10:15',
    speakerIds: ['sp-006', 'sp-007'],
    trackId: 'track-ai',
    tagIds: ['tag-keynote'],
  },
  {
    id: 's-attention-economy',
    title: 'The Attention Economy',
    description: 'Why voice and video are winning attention, and what that means for media businesses.',
    dayId: '2026-05-29',
    stageId: 'stage-chelsea',
    startTime: '10:30',
    endTime: '11:00',
    speakerIds: ['sp-001'],
    trackId: 'track-culture',
    tagIds: ['tag-lightning'],
  },
  {
    id: 's-media-age-ai',
    title: 'Media in the Age of AI',
    description: 'A panel on how newsrooms and studios adapt when anyone can generate text and video.',
    dayId: '2026-05-29',
    stageId: 'stage-cinema',
    startTime: '11:00',
    endTime: '11:40',
    speakerIds: ['sp-019', 'sp-010'],
    trackId: 'track-culture',
    tagIds: ['tag-panel'],
    capacity: 50,
  },
  {
    id: 's-closing-series-a',
    title: 'Closing the Series A',
    description: 'A practical workshop on building the data room and story that gets a term sheet signed.',
    dayId: '2026-05-29',
    stageId: 'stage-hudson',
    startTime: '12:00',
    endTime: '12:45',
    speakerIds: ['sp-003'],
    trackId: 'track-fintech',
    tagIds: ['tag-workshop'],
  },
  {
    id: 's-bolt-road-unicorn',
    title: "Company 5's Road to a Unicorn",
    description: 'A fireside chat on the early decisions that compounded into one of the region\u2019s fastest scale-ups.',
    dayId: '2026-05-29',
    stageId: 'stage-chelsea',
    startTime: '13:30',
    endTime: '14:15',
    speakerIds: ['sp-005'],
    trackId: 'track-startups',
    tagIds: ['tag-fireside'],
  },
  {
    id: 's-ai-companions-agents',
    title: 'AI Companions and Agents',
    description: 'A workshop on building useful autonomous agents that people actually trust.',
    dayId: '2026-05-29',
    stageId: 'stage-cinema',
    startTime: '14:30',
    endTime: '15:00',
    speakerIds: ['sp-053'],
    trackId: 'track-ai',
    tagIds: ['tag-workshop'],
    capacity: 35,
  },
  {
    id: 's-next-ten-years',
    title: 'The Next Ten Years',
    description: 'A closing panel on the technologies and markets worth watching over the coming decade.',
    dayId: '2026-05-29',
    stageId: 'stage-hudson',
    startTime: '15:30',
    endTime: '16:15',
    speakerIds: ['sp-019', 'sp-053', 'sp-003'],
    trackId: 'track-culture',
    tagIds: ['tag-panel'],
  },
  {
    id: 's-founders-lightning',
    title: "Founders' Lightning Round",
    description: 'Fast talks from founders on the one lesson they wish they had learned earlier.',
    dayId: '2026-05-29',
    stageId: 'stage-chelsea',
    startTime: '16:30',
    endTime: '17:15',
    speakerIds: ['sp-001', 'sp-004'],
    trackId: 'track-startups',
    tagIds: ['tag-lightning'],
  },

  // Side events (all day, one per day)
  {
    id: 'side-day-one',
    title: 'Side Events Wednesday',
    description: 'Partner-hosted dinners, demos and meetups around New York. See the external link for the full list.',
    dayId: '2026-05-27',
    stageId: 'stage-side',
    startTime: '09:00',
    endTime: '23:00',
    speakerIds: [],
    trackId: 'track-startups',
    tagIds: [],
    allDay: true,
    url: 'https://lu.ma/eventor-day-one',
  },
  {
    id: 'side-day-two',
    title: 'Side Events Thursday',
    description: 'Partner-hosted dinners, demos and meetups around New York. See the external link for the full list.',
    dayId: '2026-05-28',
    stageId: 'stage-side',
    startTime: '09:00',
    endTime: '23:00',
    speakerIds: [],
    trackId: 'track-startups',
    tagIds: [],
    allDay: true,
    url: 'https://lu.ma/eventor-day-two',
  },
  {
    id: 'side-day-three',
    title: 'Side Events Friday',
    description: 'Partner-hosted dinners, demos and meetups around New York. See the external link for the full list.',
    dayId: '2026-05-29',
    stageId: 'stage-side',
    startTime: '09:00',
    endTime: '23:00',
    speakerIds: [],
    trackId: 'track-startups',
    tagIds: [],
    allDay: true,
    url: 'https://lu.ma/eventor-day-three',
  },
];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function interestId(categoryId: string, name: string): string {
  return `${slug(categoryId)}-${slug(name)}`;
}

function allowedIntents(categoryId: string): Intent['id'][] {
  switch (categoryId) {
    case 'group-industry':
      return ['networking', 'trading', 'investment', 'recruitment'];
    case 'group-startup-stage':
    case 'group-investment-type':
      return ['networking', 'investment'];
    case 'group-film-music':
      return ['networking', 'recruitment', 'mentoring'];
    default:
      return ['networking'];
  }
}

export const intents: Intent[] = [
  { id: 'networking', name: 'Networking' },
  { id: 'trading', name: 'Trading' },
  { id: 'investment', name: 'Investment' },
  { id: 'recruitment', name: 'Recruitment' },
  { id: 'mentoring', name: 'Mentoring' },
];

export const goals: Goal[] = [
  { id: 'network', intentId: 'networking', label: 'Network about this', shortLabel: '', pairsWith: 'network' },
  { id: 'buy', intentId: 'trading', label: 'Explore getting or buying', shortLabel: 'Buy', pairsWith: 'sell' },
  { id: 'sell', intentId: 'trading', label: 'Offer or sell this', shortLabel: 'Sell', pairsWith: 'buy' },
  { id: 'get-investment', intentId: 'investment', label: 'Get investment in this', shortLabel: 'Seeking investment', pairsWith: 'invest' },
  { id: 'invest', intentId: 'investment', label: 'Invest in this', shortLabel: 'Invest', pairsWith: 'get-investment' },
  { id: 'get-job', intentId: 'recruitment', label: 'Get a job in this', shortLabel: 'Seeking a job', pairsWith: 'offer-job' },
  { id: 'offer-job', intentId: 'recruitment', label: 'Offer a job in this', shortLabel: 'Hiring', pairsWith: 'get-job' },
  { id: 'find-mentor', intentId: 'mentoring', label: 'Find a mentor', shortLabel: 'Seeking a mentor', pairsWith: 'be-mentor' },
  { id: 'be-mentor', intentId: 'mentoring', label: 'Be a mentor', shortLabel: 'Mentor', pairsWith: 'find-mentor' },
];

const groupDefinitions: { id: string; name: string; names: string[] }[] = [
  {
    id: 'group-industry',
    name: 'Industry',
    names: [
      'Fintech', 'Foodtech', 'Gaming', 'Health & Wellbeing', 'Jobs & Recruitment',
      'Legaltech', 'Life Sciences', 'Media', 'Music', 'Robotics', 'Space Tech',
      'Sports', 'Travel', 'Social Impact', 'Visual Arts',
    ],
  },
  {
    id: 'group-startup-stage',
    name: 'Startup Stage',
    names: [
      'Idea Stage', 'Early Stage (Pre-Seed and Seed)', 'Series A', 'Series B',
      'Growth Stage (Scale-Up)', 'Later Stage - IPO',
    ],
  },
  {
    id: 'group-investment-type',
    name: 'Investment Type',
    names: [
      'Angel Investment', 'Early Stage (Pre-Seed and Seed)', 'Series A', 'Series B',
      'Growth Stage',
    ],
  },
  {
    id: 'group-film-music',
    name: 'Film & Music Roles',
    names: [
      'Film Director', 'Film Producer', 'Screenwriter', 'Cinematographer', 'Editor',
      'Actor', 'Musician', 'Songwriter', 'Performer', 'Music Producer',
    ],
  },
];

export const interests: Interest[] = groupDefinitions.flatMap((group) =>
  group.names.map((name) => ({
    id: interestId(group.id, name),
    name,
    categoryId: group.id,
    intents: allowedIntents(group.id),
  })),
);

export const interestGroups: InterestGroup[] = groupDefinitions.map((group) => ({
  id: group.id,
  name: group.name,
  interests: interests.filter((interest) => interest.categoryId === group.id),
}));

function sel(categoryId: string, name: string, goalId: string): Selection {
  return { interestId: interestId(categoryId, name), goalId };
}

const allNetworkSelections: Selection[] = interests.map((interest) => ({
  interestId: interest.id,
  goalId: 'network',
}));

export const people: Person[] = [
  {
    id: 'person-1', name: 'Attendee 1', role: 'Startup', title: 'Founder & CEO', company: 'Startup 1',
    intro: 'Building a platform that helps small farmers sell directly to restaurants.', industry: 'Foodtech',
    countries: ['United States'], lastActiveAt: '2026-05-26T09:00:00',
    selections: [
      sel('group-industry', 'Foodtech', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Travel', 'network'),
      sel('group-industry', 'Social Impact', 'network'),
    ],
  },
  {
    id: 'person-2', name: 'Attendee 2', role: 'Investor', title: 'Principal', company: 'Sponsor 10',
    intro: 'Early-stage investor focused on fintech and marketplaces across the Northeast.', industry: 'Fintech',
    countries: ['United States', 'United Kingdom'], lastActiveAt: '2026-05-25T14:00:00',
    selections: [
      sel('group-industry', 'Fintech', 'invest'),
      sel('group-industry', 'Travel', 'invest'),
      sel('group-investment-type', 'Early Stage (Pre-Seed and Seed)', 'invest'),
      sel('group-investment-type', 'Series A', 'invest'),
    ],
  },
  {
    id: 'person-3', name: 'Attendee 3', role: 'Startup', title: 'Co-Founder', company: 'Startup 2',
    intro: 'Designing warehouse robots that work safely alongside people.', industry: 'Robotics',
    countries: ['United States', 'Germany'], lastActiveAt: '2026-05-24T10:00:00',
    selections: [
      sel('group-industry', 'Robotics', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Space Tech', 'network'),
    ],
  },
  {
    id: 'person-4', name: 'Attendee 4', role: 'Corporate', title: 'Head of Innovation', company: 'Organizer 4',
    intro: 'Scouting startups and running pilots across a national telecom operator.', industry: 'Telecom',
    countries: ['United States'], lastActiveAt: '2026-05-23T16:00:00',
    selections: [
      sel('group-industry', 'Space Tech', 'buy'),
      sel('group-industry', 'Robotics', 'buy'),
      sel('group-industry', 'Media', 'buy'),
      sel('group-industry', 'Fintech', 'offer-job'),
    ],
  },
  {
    id: 'person-5', name: 'Attendee 5', role: 'Investor', title: 'Partner', company: 'Company 58',
    intro: 'Invests in founders building financial tools for emerging markets.', industry: 'Fintech',
    countries: ['Nigeria', 'United Kingdom'], lastActiveAt: '2026-05-22T11:00:00',
    selections: [
      sel('group-industry', 'Fintech', 'invest'),
      sel('group-industry', 'Social Impact', 'invest'),
      sel('group-investment-type', 'Early Stage (Pre-Seed and Seed)', 'invest'),
      sel('group-investment-type', 'Series A', 'invest'),
      sel('group-industry', 'Legaltech', 'invest'),
    ],
  },
  {
    id: 'person-6', name: 'Attendee 6', role: 'Startup', title: 'CTO', company: 'Organizer 3',
    intro: 'Leading engineering on a home energy-storage product for the DACH market.', industry: 'Climate',
    countries: ['Austria'], lastActiveAt: '2026-05-21T09:00:00',
    selections: [
      sel('group-industry', 'Social Impact', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Space Tech', 'network'),
    ],
  },
  {
    id: 'person-7', name: 'Attendee 7', role: 'Media', title: 'Journalist', company: 'Company 59',
    intro: 'Covers the startup and venture scene across the New York area.', industry: 'Media',
    countries: ['United States'], lastActiveAt: '2026-05-26T18:00:00',
    selections: allNetworkSelections,
  },
  {
    id: 'person-8', name: 'Attendee 8', role: 'Corporate', title: 'Innovation Lead', company: 'Company 60',
    intro: 'Runs open-innovation programs for a life-sciences research group.', industry: 'Life Sciences',
    countries: ['Sweden'], lastActiveAt: '2026-05-20T13:00:00',
    selections: [
      sel('group-industry', 'Life Sciences', 'buy'),
      sel('group-industry', 'Health & Wellbeing', 'buy'),
      sel('group-industry', 'Media', 'network'),
    ],
  },
  {
    id: 'person-9', name: 'Attendee 9', role: 'Startup', title: 'Founder', company: 'Startup 3',
    intro: 'Building a music-learning app that adapts to how each student practices.', industry: 'Music',
    countries: ['United States'], lastActiveAt: '2026-05-25T08:00:00',
    selections: [
      sel('group-industry', 'Music', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Media', 'network'),
    ],
  },
  {
    id: 'person-10', name: 'Attendee 10', role: 'Investor', title: 'Angel Investor', company: 'Independent',
    intro: 'Writes small checks into early gaming and consumer startups.', industry: 'Gaming',
    countries: ['France'], lastActiveAt: '2026-05-19T15:00:00',
    selections: [
      sel('group-industry', 'Gaming', 'invest'),
      sel('group-industry', 'Music', 'invest'),
      sel('group-investment-type', 'Angel Investment', 'invest'),
      sel('group-investment-type', 'Early Stage (Pre-Seed and Seed)', 'invest'),
      sel('group-industry', 'Visual Arts', 'invest'),
    ],
  },
  {
    id: 'person-11', name: 'Attendee 11', role: 'Startup', title: 'CEO', company: 'Startup 4',
    intro: 'Building an electric boat-rental network for harbor tourism.', industry: 'Travel',
    countries: ['United States'], lastActiveAt: '2026-05-24T17:00:00',
    selections: [
      sel('group-industry', 'Travel', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Social Impact', 'network'),
    ],
  },
  {
    id: 'person-12', name: 'Attendee 12', role: 'Corporate', title: 'Partnerships Director', company: 'Company 61',
    intro: 'Leads partnerships for a contract-automation software company.', industry: 'Legaltech',
    countries: ['Germany'], lastActiveAt: '2026-05-18T10:00:00',
    selections: [
      sel('group-industry', 'Legaltech', 'buy'),
      sel('group-industry', 'Fintech', 'buy'),
      sel('group-industry', 'Media', 'network'),
    ],
  },
  {
    id: 'person-13', name: 'Attendee 13', role: 'Startup', title: 'Founder', company: 'Startup 5',
    intro: 'Building remote-monitoring tools for chronic-care clinics.', industry: 'Health & Wellbeing',
    countries: ['United States'], lastActiveAt: '2026-05-23T12:00:00',
    selections: [
      sel('group-industry', 'Health & Wellbeing', 'get-investment'),
      sel('group-industry', 'Life Sciences', 'network'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-startup-stage', 'Series A', 'get-investment'),
    ],
  },
  {
    id: 'person-14', name: 'Attendee 14', role: 'Investor', title: 'Associate', company: 'Sponsor 11',
    intro: 'Backs biotech and digital-health companies at seed and Series A.', industry: 'Life Sciences',
    countries: ['France'], lastActiveAt: '2026-05-17T09:00:00',
    selections: [
      sel('group-industry', 'Life Sciences', 'invest'),
      sel('group-industry', 'Health & Wellbeing', 'invest'),
      sel('group-investment-type', 'Series A', 'invest'),
      sel('group-investment-type', 'Early Stage (Pre-Seed and Seed)', 'invest'),
    ],
  },
  {
    id: 'person-15', name: 'Attendee 15', role: 'Startup', title: 'Co-Founder', company: 'Startup 6',
    intro: 'Making a game engine for small teams building stylized 3D worlds.', industry: 'Gaming',
    countries: ['United States'], lastActiveAt: '2026-05-22T14:00:00',
    selections: [
      sel('group-industry', 'Gaming', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Visual Arts', 'network'),
      sel('group-industry', 'Music', 'network'),
    ],
  },
  {
    id: 'person-16', name: 'Attendee 16', role: 'Media', title: 'Producer', company: 'Company 62',
    intro: 'Produces independent film and documentary projects across Europe.', industry: 'Visual Arts',
    countries: ['Germany'], lastActiveAt: '2026-05-26T20:00:00',
    selections: allNetworkSelections,
  },
  {
    id: 'person-17', name: 'Attendee 17', role: 'Corporate', title: 'Digital Director', company: 'Sponsor 8',
    intro: 'Leads digital transformation for a heritage retail group.', industry: 'Retail',
    countries: ['United States'], lastActiveAt: '2026-05-21T11:00:00',
    selections: [
      sel('group-industry', 'Media', 'buy'),
      sel('group-industry', 'Fintech', 'buy'),
      sel('group-industry', 'Social Impact', 'network'),
    ],
  },
  {
    id: 'person-18', name: 'Attendee 18', role: 'Startup', title: 'Founder', company: 'Company 63',
    intro: 'Building self-serve legal tools for early-stage founders.', industry: 'Legaltech',
    countries: ['United Kingdom'], lastActiveAt: '2026-05-25T13:00:00',
    selections: [
      sel('group-industry', 'Legaltech', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Fintech', 'network'),
    ],
  },
  {
    id: 'person-19', name: 'Attendee 19', role: 'Investor', title: 'Managing Partner', company: 'Company 64',
    intro: 'Invests in deep tech with a focus on space and defense.', industry: 'Space Tech',
    countries: ['United States'], lastActiveAt: '2026-05-20T16:00:00',
    selections: [
      sel('group-industry', 'Space Tech', 'invest'),
      sel('group-industry', 'Robotics', 'invest'),
      sel('group-investment-type', 'Series A', 'invest'),
      sel('group-investment-type', 'Early Stage (Pre-Seed and Seed)', 'invest'),
    ],
  },
  {
    id: 'person-20', name: 'Attendee 20', role: 'Startup', title: 'CMO', company: 'Company 65',
    intro: 'Leads marketing for a creator-economy analytics startup.', industry: 'Media',
    countries: ['United States'], lastActiveAt: '2026-05-26T10:00:00',
    selections: [
      sel('group-industry', 'Media', 'get-investment'),
      sel('group-startup-stage', 'Early Stage (Pre-Seed and Seed)', 'get-investment'),
      sel('group-industry', 'Music', 'network'),
      sel('group-industry', 'Visual Arts', 'network'),
    ],
  },
];

export const sponsorTiers: SponsorTier[] = [
  {
    id: 'tier-founding-year1',
    name: 'Founding Partner (Since Year 1)',
    order: 1,
    sponsors: [
      {
        id: 'sponsor-skyline',
        name: 'Sponsor 1',
        tierId: 'tier-founding-year1',
        description: 'A major U.S. airline, flying attendees to the summit from across the country.',
        interestIds: ['group-industry-travel', 'group-industry-media'],
        links: { website: 'https://skylineair.example' },
        team: ['person-4', 'person-17'],
      },
      {
        id: 'sponsor-nbg',
        name: 'Sponsor 2',
        tierId: 'tier-founding-year1',
        description: 'One of the city\u2019s oldest banks, backing founders with capital and advice.',
        interestIds: ['group-industry-fintech', 'group-investment-type-angel-investment', 'group-startup-stage-early-stage-pre-seed-and-seed'],
        links: { website: 'https://empirestatebank.example' },
        team: ['person-2', 'person-19'],
      },
    ],
  },
  {
    id: 'tier-founding',
    name: 'Founding Partner',
    order: 2,
    sponsors: [
      {
        id: 'sponsor-kaizen',
        name: 'Sponsor 3',
        tierId: 'tier-founding',
        description: 'A gaming and technology company behind some of the most played platforms in North America.',
        interestIds: ['group-industry-gaming', 'group-industry-media', 'group-industry-visual-arts'],
        links: { website: 'https://arcadeworks.example' },
        team: ['person-10', 'person-15'],
      },
      {
        id: 'sponsor-dei',
        name: 'Sponsor 4',
        tierId: 'tier-founding',
        description: 'A regional power utility, investing in energy and climate startups.',
        interestIds: ['group-industry-social-impact', 'group-industry-robotics', 'group-industry-space-tech'],
        links: { website: 'https://metropower.example' },
        team: ['person-8', 'person-12'],
      },
    ],
  },
  {
    id: 'tier-investing',
    name: 'Investing Partner',
    order: 3,
    sponsors: [
      {
        id: 'sponsor-deep-capital',
        name: 'Sponsor 5',
        tierId: 'tier-investing',
        description: 'A venture firm backing technical founders across North America and Europe.',
        interestIds: ['group-industry-fintech', 'group-industry-life-sciences', 'group-investment-type-series-a'],
        links: { website: 'https://deepcapital.example' },
        team: ['person-5', 'person-14'],
      },
    ],
  },
  {
    id: 'tier-technology',
    name: 'Technology Partner',
    order: 4,
    sponsors: [
      {
        id: 'sponsor-helios-cloud',
        name: 'Sponsor 6',
        tierId: 'tier-technology',
        description: 'Cloud infrastructure provider powering the summit app and demos.',
        interestIds: ['group-industry-fintech', 'group-industry-robotics', 'group-industry-space-tech'],
        links: { website: 'https://hudsoncloud.example' },
        team: ['person-3', 'person-11'],
      },
    ],
  },
  { id: 'tier-strategic', name: 'Strategic Partner', order: 5, sponsors: [] },
  { id: 'tier-tourism', name: 'Tourism Partner', order: 6, sponsors: [] },
  { id: 'tier-beauty-tech', name: 'Beauty-Tech Partner', order: 7, sponsors: [] },
  { id: 'tier-innovation', name: 'Innovation Partner', order: 8, sponsors: [] },
  { id: 'tier-event', name: 'Event Partner', order: 9, sponsors: [] },
];

export const places: Place[] = [
  { id: 'place-hudson', name: 'Hudson Hall', category: 'stage', x: 0.5, y: 0.2, description: 'The main stage, in a restored brick hall with a double-height ceiling.' },
  { id: 'place-chelsea', name: 'Chelsea Pavilion', category: 'stage', x: 0.25, y: 0.55, description: 'A large pavilion for keynotes and panels with tiered seating.' },
  { id: 'place-cinema', name: 'Tribeca Theater', category: 'stage', x: 0.75, y: 0.55, description: 'A screening room used for workshops and film sessions.' },
  { id: 'place-chill', name: 'Chill & Wellness Lounge', category: 'lounge', x: 0.15, y: 0.2, description: 'A quiet corner with seating, water and a wellness area.' },
  { id: 'place-networking', name: 'Networking Area', category: 'lounge', x: 0.5, y: 0.75, description: 'The central hall for meetings and 1:1 conversations.' },
  { id: 'place-registration', name: 'Registration', category: 'service', x: 0.85, y: 0.15, description: 'Pick up your badge and check in at the main entrance.' },
];

export const announcements: Announcement[] = [
  {
    id: 'a-welcome',
    title: 'Welcome to Eventor',
    body: 'Doors open at 08:30 each morning. Grab your badge at Registration and say hello at the Networking Area.',
    date: '2026-05-26T09:00:00',
  },
  {
    id: 'a-keynote-change',
    title: 'Keynote room change',
    body: 'The 09:45 keynote on Tuesday has moved to the Chelsea Pavilion to fit more seats.',
    date: '2026-05-26T15:30:00',
  },
  {
    id: 'a-app-update',
    title: 'Enable notifications',
    body: 'Turn on notifications in Account to get reminders fifteen minutes before each of your meetings.',
    date: '2026-05-27T08:00:00',
  },
  {
    id: 'a-lunch',
    title: 'Lunch is served',
    body: 'A light lunch is available in the Networking Area from 12:30 to 14:00 every day.',
    date: '2026-05-27T11:45:00',
  },
  {
    id: 'a-afterparty',
    title: 'Friday afterparty',
    body: 'Join us at the Chelsea Pavilion after the closing panel for drinks and a live set. Everyone is welcome.',
    date: '2026-05-28T18:00:00',
  },
];


