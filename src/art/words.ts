// A word a day: terms from the world of events, startups and networking, with a short
// definition and a note on how each one shows up at the event.
import { eventWallClock } from '@/lib/event-clock';

export type Word = {
  id: string;
  term: string;
  pronunciation: string;
  english: string;
  meaning: string;
  atEvent: string;
};

export const WORDS: Word[] = [
  { id: 'serendipity', term: 'Serendipity', pronunciation: 'ser-uhn-DIP-i-tee', english: 'happy accident', meaning: 'Finding something valuable without looking for it.', atEvent: 'The best introduction of the day is usually the one you did not plan.' },
  { id: 'rapport', term: 'Rapport', pronunciation: 'ra-POR', english: 'easy connection', meaning: 'A relationship where people understand each other and communicate well.', atEvent: 'Two good questions build more rapport than ten business cards.' },
  { id: 'cohort', term: 'Cohort', pronunciation: 'KOH-hort', english: 'group together', meaning: 'A group that goes through something at the same time.', atEvent: 'The people you meet on day one become the cohort you check in with for years.' },
  { id: 'keynote', term: 'Keynote', pronunciation: 'KEE-noht', english: 'the headline talk', meaning: 'The talk that sets the tone for the whole program.', atEvent: 'Arrive early; the hallway before a keynote is where the room is warmest.' },
  { id: 'pitch', term: 'Pitch', pronunciation: 'pich', english: 'the short case', meaning: 'A brief, persuasive summary of an idea or a company.', atEvent: 'If you cannot give your pitch while walking to coffee, it is too long.' },
  { id: 'synergy', term: 'Synergy', pronunciation: 'SIN-er-jee', english: 'better together', meaning: 'When two things combined do more than the sum of their parts.', atEvent: 'Look for the person whose gap is your strength.' },
  { id: 'momentum', term: 'Momentum', pronunciation: 'moh-MEN-tuhm', english: 'building speed', meaning: 'Progress that makes the next step easier than the last.', atEvent: 'Follow up within a day while the conversation still has momentum.' },
  { id: 'catalyst', term: 'Catalyst', pronunciation: 'KAT-uh-list', english: 'the spark', meaning: 'Something that speeds up a change without being used up by it.', atEvent: 'A good host is a catalyst: they introduce two people and step back.' },
  { id: 'iterate', term: 'Iterate', pronunciation: 'IT-uh-rayt', english: 'try again, better', meaning: 'To improve something by repeating it with small changes.', atEvent: 'Reuse your opening line, notice what lands, iterate by the next session.' },
  { id: 'network', term: 'Network', pronunciation: 'NET-wurk', english: 'web of people', meaning: 'The set of people you can reach and who can reach you.', atEvent: 'Your network grows fastest when you introduce two people who should know each other.' },
  { id: 'mentor', term: 'Mentor', pronunciation: 'MEN-tor', english: 'trusted guide', meaning: 'Someone who shares experience to help another person grow.', atEvent: 'Ask the question you are slightly embarrassed to ask; mentors remember being there.' },
  { id: 'cadence', term: 'Cadence', pronunciation: 'KAY-dns', english: 'steady rhythm', meaning: 'A regular pattern or pace of activity.', atEvent: 'Set a simple cadence: one new conversation per session beats a frantic lobby.' },
  { id: 'pipeline', term: 'Pipeline', pronunciation: 'PYP-lyn', english: 'what is coming', meaning: 'The set of opportunities moving toward a decision.', atEvent: 'Every good hallway chat is the top of someone’s pipeline.' },
  { id: 'runway', term: 'Runway', pronunciation: 'RUHN-way', english: 'time to act', meaning: 'How long resources will last before a decision is forced.', atEvent: 'Treat your time here as runway: spend it on people, not on your phone.' },
  { id: 'traction', term: 'Traction', pronunciation: 'TRAK-shuhn', english: 'things working', meaning: 'Early evidence that an idea is catching on.', atEvent: 'Share one concrete number; traction travels further than adjectives.' },
  { id: 'hallway', term: 'Hallway', pronunciation: 'HAWL-way', english: 'the real track', meaning: 'The informal conversations that happen between sessions.', atEvent: 'The hallway track is a track; budget time for it on purpose.' },
  { id: 'lightning', term: 'Lightning', pronunciation: 'LYT-ning', english: 'short and sharp', meaning: 'A very short talk, usually a few minutes.', atEvent: 'A lightning talk is a trailer; follow the speaker out to see the full film.' },
  { id: 'panel', term: 'Panel', pronunciation: 'PAN-l', english: 'many voices', meaning: 'A discussion among several speakers on one topic.', atEvent: 'The best question from the audience often outlasts the panel itself.' },
  { id: 'demo', term: 'Demo', pronunciation: 'DEM-oh', english: 'show, do not tell', meaning: 'A live showing of how something works.', atEvent: 'A ninety-second demo beats a ten-slide description every time.' },
  { id: 'roadmap', term: 'Roadmap', pronunciation: 'ROHD-map', english: 'the plan ahead', meaning: 'A plan of what comes next and roughly when.', atEvent: 'Ask people what is on their roadmap; it tells you how to help.' },
  { id: 'community', term: 'Community', pronunciation: 'kuh-MYOO-ni-tee', english: 'people who return', meaning: 'A group that keeps showing up for one another over time.', atEvent: 'An event ends; a community is what you carry home from it.' },
];

/** Day of the year (0 based) on the event calendar. */
export function dayOfYear(date: Date): number {
  const [year, month, day] = eventWallClock(date).day.split('-').map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000);
}

export function wordForDay(date: Date): Word {
  return WORDS[dayOfYear(date) % WORDS.length];
}
