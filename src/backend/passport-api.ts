import { getDb, load, scheduleWrite } from '@/backend/db';
import { delay } from '@/backend/latency';
import { getStampTarget, listChallenges, listStampTargets } from '@/data';
import { passportProgress } from '@/lib/passport';

/** Twelve sample attendees with fixed points, so the leaderboard has life beyond the demo accounts. */
const SAMPLE_ATTENDEES = [
  { name: 'Attendee 24', points: 180 },
  { name: 'Attendee 25', points: 165 },
  { name: 'Attendee 26', points: 150 },
  { name: 'Attendee 27', points: 140 },
  { name: 'Attendee 28', points: 125 },
  { name: 'Attendee 29', points: 110 },
  { name: 'Attendee 30', points: 95 },
  { name: 'Attendee 31', points: 80 },
  { name: 'Attendee 32', points: 65 },
  { name: 'Attendee 33', points: 50 },
  { name: 'Attendee 34', points: 35 },
  { name: 'Attendee 35', points: 20 },
];

/** One leaderboard row; accountId is null for the sample attendees. */
export type LeaderboardRow = {
  accountId: string | null;
  name: string;
  points: number;
  rank: number;
};

export const passportApi = {
  /** POST /passport/stamps (idempotent: true only when newly collected for a known account and target) */
  async collect(accountId: string, targetId: string): Promise<boolean> {
    await load();
    await delay();
    const state = getDb().states[accountId];
    if (!state || !getStampTarget(targetId)) return false;
    if (state.stamps.some((stamp) => stamp.targetId === targetId)) return false;
    state.stamps = [...state.stamps, { targetId, at: new Date().toISOString() }];
    scheduleWrite();
    return true;
  },
  /** GET /passport/leaderboard */
  async leaderboard(): Promise<LeaderboardRow[]> {
    await load();
    await delay();
    const db = getDb();
    const targets = listStampTargets();
    const challenges = listChallenges();
    const entries: Omit<LeaderboardRow, 'rank'>[] = Object.values(db.accounts).map((account) => {
      const state = db.states[account.id];
      return {
        accountId: account.id,
        name: account.name,
        points: state ? passportProgress(state.stamps, targets, challenges).points : 0,
      };
    });
    entries.push(...SAMPLE_ATTENDEES.map((sample) => ({ accountId: null, ...sample })));
    entries.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    // Equal points share a rank: the rank of the first entry with those points.
    const rows: LeaderboardRow[] = [];
    entries.forEach((entry, index) => {
      const previous = rows[index - 1];
      const rank = previous && previous.points === entry.points ? previous.rank : index + 1;
      rows.push({ ...entry, rank });
    });
    return rows;
  },
};
