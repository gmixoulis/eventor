import type { Stamp, StoreState } from '@/backend/types';
import type { StampChallenge, StampKind, StampTarget } from '@/data/types';

export type PassportProgress = {
  points: number;
  collected: number;
  total: number;
  challenges: { id: string; done: boolean; progress: number; goal: number; bonus: number }[];
};

/**
 * Points are the sum of stamp target points plus the bonus of every completed challenge.
 * `collected` counts known targets stamped at least once; challenge progress counts those of
 * the rule's kind (or all of them for 'any').
 */
export function passportProgress(
  stamps: Stamp[],
  targets: StampTarget[],
  challenges: StampChallenge[],
): PassportProgress {
  const targetById = new Map(targets.map((target) => [target.id, target]));
  // Each known target counts once, however many times it was stamped.
  const collected = [...new Set(stamps.map((stamp) => stamp.targetId))].flatMap((id) => {
    const target = targetById.get(id);
    return target ? [target] : [];
  });

  let points = 0;
  const counts: Record<StampKind, number> = { place: 0, sponsor: 0, 'side-event': 0 };
  for (const target of collected) {
    points += target.points;
    counts[target.kind] += 1;
  }

  const challengeResults = challenges.map((challenge) => {
    const goal = challenge.rule.count;
    const progress = challenge.rule.kind === 'any' ? collected.length : counts[challenge.rule.kind];
    const done = progress >= goal;
    if (done) points += challenge.bonus;
    return {
      id: challenge.id,
      done,
      progress: Math.min(progress, goal),
      goal,
      bonus: challenge.bonus,
    };
  });

  return {
    points,
    collected: collected.length,
    total: targets.length,
    challenges: challengeResults,
  };
}

/**
 * The one way a stamp lands in an account's state: the stamp plus a "Stamp collected" activity
 * line. Unchanged when the target is unknown or already stamped.
 */
export function withStamp(
  state: StoreState,
  targetId: string,
  targets: StampTarget[],
  at: string,
  activityId: string,
): StoreState {
  const target = targets.find((t) => t.id === targetId);
  if (!target || state.stamps.some((stamp) => stamp.targetId === targetId)) return state;
  return {
    ...state,
    stamps: [...state.stamps, { targetId, at }],
    activity: [
      { id: activityId, kind: 'stamp', title: `Stamp collected: ${target.title}`, body: '', date: at },
      ...state.activity,
    ],
  };
}
