import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import type { DirectionStep } from '@/components/venue/directions';
import { nextStepEnd, walkAlong } from '@/components/venue/position';
import type { Point } from '@/components/venue/venue-data';

export type WalkSpeed = 1 | 4 | 10;
export type Walk = { distance: number; playing: boolean };

const WALKING_SPEED = 1.3; // m/s, the same pace walkingMinutes uses
const TICK_MS = 250;
const REDUCED_TICK_MS = 1500;

/** Demo only: moves a simulated walker along the route. Memory only, so it never survives a restart. */
export function useRouteWalk(path: Point[] | undefined, steps: DirectionStep[]) {
  const [walk, setWalk] = useState<Walk>();
  const [speed, setSpeed] = useState<WalkSpeed>(1);
  const reduceMotion = useReducedMotion();
  const at = walk && path?.length ? walkAlong(path, walk.distance) : undefined;
  const running = !!walk?.playing && !!path && !at?.done;

  useEffect(() => {
    if (!running || !path) return;
    // Reduced motion: jump from one step end to the next instead of gliding.
    const timer = setInterval(() => setWalk((w) => w && { ...w, distance: reduceMotion
      ? nextStepEnd(path, steps, w.distance) : w.distance + WALKING_SPEED * speed * TICK_MS / 1000 }), reduceMotion ? REDUCED_TICK_MS / speed : TICK_MS);
    return () => clearInterval(timer);
  }, [running, path, steps, reduceMotion, speed]);

  return {
    walk, at, speed, setSpeed,
    start: () => setWalk({ distance: 0, playing: true }),
    pause: () => setWalk((w) => w && { ...w, playing: false }),
    resume: () => setWalk((w) => w && { ...w, playing: true }),
    stop: () => setWalk(undefined),
  };
}
