import type { Href } from 'expo-router';

import type { AskSource } from '@/lib/assistant-contract';
import { isPathEnabled, type FeatureFlags } from '@/lib/features';

/** Where a source chip leads. Place sources open the map, pitch sources the reels, day sources the schedule. */
function target(source: AskSource): Href {
  switch (source.type) {
    case 'session': return { pathname: '/session/[id]', params: { id: source.id } };
    case 'speaker': return { pathname: '/speaker/[id]', params: { id: source.id } };
    case 'sponsor': return { pathname: '/sponsor/[id]', params: { id: source.id } };
    case 'person': return { pathname: '/person/[id]', params: { id: source.id } };
    case 'sideEvent': return { pathname: '/side-event/[id]', params: { id: source.id } };
    case 'place': return '/map';
    case 'pitch': return '/reels';
    case 'day': return '/schedule';
  }
}

/** A source chip's link, or null when its screen is switched off (the chip then shows as plain text). */
export function sourceHref(source: AskSource, flags: FeatureFlags): Href | null {
  const href = target(source);
  return isPathEnabled(typeof href === 'string' ? href : href.pathname, flags) ? href : null;
}
