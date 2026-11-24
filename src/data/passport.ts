import { places, sponsorTiers } from '@/data/seed';
import { sideEvents } from '@/data/side-events';
import type { StampChallenge, StampTarget } from '@/data/types';

/** A stamp target's stable id is `kind:refId`, so a place visit maps to its target directly. */
export function stampTargetId(kind: StampTarget['kind'], refId: string): string {
  return `${kind}:${refId}`;
}

/** Every place (10 points), sponsor (15) and side event (20) is a stamp target. */
const STAMP_TARGETS: StampTarget[] = (() => {
  const placesTargets = places.map((place) => ({
    id: stampTargetId('place', place.id),
    kind: 'place' as const,
    refId: place.id,
    title: place.name,
    points: 10,
  }));
  const sponsorTargets = sponsorTiers
    .flatMap((tier) => tier.sponsors)
    .map((sponsor) => ({
      id: stampTargetId('sponsor', sponsor.id),
      kind: 'sponsor' as const,
      refId: sponsor.id,
      title: sponsor.name,
      points: 15,
    }));
  const eventTargets = sideEvents.map((event) => ({
    id: stampTargetId('side-event', event.id),
    kind: 'side-event' as const,
    refId: event.id,
    title: event.title,
    points: 20,
  }));
  return [...placesTargets, ...sponsorTargets, ...eventTargets];
})();

export function listStampTargets(): StampTarget[] {
  return STAMP_TARGETS;
}

export function getStampTarget(id: string): StampTarget | undefined {
  return STAMP_TARGETS.find((target) => target.id === id);
}

const CHALLENGES: StampChallenge[] = [
  {
    id: 'ch-stages-3',
    title: 'Visit 3 stages',
    description: 'Collect stamps at three stages or venues.',
    rule: { kind: 'place', count: 3 },
    bonus: 40,
  },
  {
    id: 'ch-booths-5',
    title: 'Check in at 5 booths',
    description: 'Collect stamps at five sponsor booths.',
    rule: { kind: 'sponsor', count: 5 },
    bonus: 60,
  },
  {
    id: 'ch-side-2',
    title: 'Attend 2 side events',
    description: 'Collect stamps at two side events.',
    rule: { kind: 'side-event', count: 2 },
    bonus: 50,
  },
  {
    id: 'ch-any-10',
    title: 'Collect 10 stamps',
    description: 'Collect ten stamps of any kind.',
    rule: { kind: 'any', count: 10 },
    bonus: 100,
  },
  {
    id: 'ch-places-2',
    title: 'First two places',
    description: 'Collect stamps at any two places.',
    rule: { kind: 'place', count: 2 },
    bonus: 20,
  },
  {
    id: 'ch-side-3',
    title: 'Side event regular',
    description: 'Collect stamps at three side events.',
    rule: { kind: 'side-event', count: 3 },
    bonus: 80,
  },
];

export function listChallenges(): StampChallenge[] {
  return CHALLENGES;
}
