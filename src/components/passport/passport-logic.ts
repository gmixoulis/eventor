// Pure helpers behind the passport screens; tested in passport-logic.test.ts.
import type { Href } from 'expo-router';

import { constellationLayout, type ConstellationLayout } from '@/art/constellation';
import { getEvent } from '@/data';
import type { StampChallenge, StampKind, StampTarget } from '@/data/types';
import type { PassportProgress } from '@/lib/passport';

const KINDS: StampKind[] = ['place', 'sponsor', 'side-event'];

/** The passport sky: about 0.7 as tall as it is wide, seeded per account so each person's sky differs. */
export function passportLayout(targets: StampTarget[], seed: string, width: number): ConstellationLayout {
  return constellationLayout(
    targets.map((t) => ({ id: t.id, kind: t.kind })),
    seed,
    width,
    Math.round(width * 0.7),
  );
}

/**
 * Constellation groups are named by stamp kind. A kind's figure is drawn once every challenge
 * for that kind is done; 'any' challenges do not complete a figure.
 */
export function completedGroups(challenges: StampChallenge[], progress: PassportProgress['challenges']): string[] {
  const done = new Set(progress.filter((c) => c.done).map((c) => c.id));
  return KINDS.filter((kind) => {
    const forKind = challenges.filter((c) => c.rule.kind === kind);
    return forKind.length > 0 && forKind.every((c) => done.has(c.id));
  });
}

/** Challenge ids that are done now but were not in `before`. */
export function newlyDone(before: string[], progress: PassportProgress['challenges']): string[] {
  return progress.filter((c) => c.done && !before.includes(c.id)).map((c) => c.id);
}

export function kindLabel(kind: StampKind): string {
  return kind === 'place' ? 'Place' : kind === 'sponsor' ? 'Sponsor booth' : 'Side event';
}

export function howToCollect(kind: StampKind): string {
  if (kind === 'place') return 'Visit this place on the map and mark it visited or scan its checkpoint';
  if (kind === 'sponsor') return "Check in at this sponsor's booth";
  return 'Check in at this side event while it is on';
}

/** Where to go to collect a target, with the button label. */
export function collectLink(target: StampTarget): { label: string; path: Href } {
  if (target.kind === 'place') return { label: 'Open the map', path: '/map' };
  if (target.kind === 'sponsor') return { label: 'Open the sponsor', path: `/sponsor/${target.refId}` };
  return { label: 'Open the side event', path: `/side-event/${target.refId}` };
}

/** The newest `limit` stamps first. ISO timestamps sort as strings. */
export function recentStamps<T extends { at: string }>(stamps: T[], limit = 5): T[] {
  return [...stamps].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function shareMessage(stamps: number, points: number, eventName: string = getEvent().name): string {
  return `I collected ${stamps} ${stamps === 1 ? 'stamp' : 'stamps'} and ${points} points at ${eventName}.`;
}
