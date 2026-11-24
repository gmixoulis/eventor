import { listSessions, listStages } from '@/data';
import type { Place, Session } from '@/data/types';

/** A place hosts talks when a stage shares its name (the lounges and services do not). */
export function placeStageId(place: Place): string | null {
  if (place.category !== 'stage') return null;
  return listStages().find((stage) => stage.name === place.name)?.id ?? null;
}

/** Today's sessions in this place's hall, in start order. Empty when the place hosts no talks that day. */
export function talksAt(place: Place, dayId: string): Session[] {
  const stageId = placeStageId(place);
  if (!stageId) return [];
  return listSessions({ day: dayId })
    .filter((session) => session.stageId === stageId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
