import { describe, expect, it } from '@jest/globals';

import { sourceHref } from '@/components/assistant/source-href';
import { mergeFeatures } from '@/lib/features';

describe('sourceHref', () => {
  const on = mergeFeatures();

  it('routes each source type', () => {
    expect(sourceHref({ type: 'session', id: 'a', title: 't' }, on)).toEqual({ pathname: '/session/[id]', params: { id: 'a' } });
    expect(sourceHref({ type: 'speaker', id: 'a', title: 't' }, on)).toEqual({ pathname: '/speaker/[id]', params: { id: 'a' } });
    expect(sourceHref({ type: 'sponsor', id: 'a', title: 't' }, on)).toEqual({ pathname: '/sponsor/[id]', params: { id: 'a' } });
    expect(sourceHref({ type: 'person', id: 'a', title: 't' }, on)).toEqual({ pathname: '/person/[id]', params: { id: 'a' } });
    expect(sourceHref({ type: 'sideEvent', id: 'a', title: 't' }, on)).toEqual({ pathname: '/side-event/[id]', params: { id: 'a' } });
    expect(sourceHref({ type: 'place', id: 'a', title: 't' }, on)).toBe('/map');
    expect(sourceHref({ type: 'pitch', id: 'a', title: 't' }, on)).toBe('/reels');
    expect(sourceHref({ type: 'day', id: 'a', title: 't' }, on)).toBe('/schedule');
  });

  it('gives no link when the target screen is switched off, and keeps the others', () => {
    const off = mergeFeatures({ schedule: false, speakers: false, sponsors: false, people: false, sideEvents: false, map: false, reels: false });
    for (const type of ['session', 'speaker', 'sponsor', 'person', 'sideEvent', 'place', 'pitch', 'day'] as const) {
      expect(sourceHref({ type, id: 'a', title: 't' }, off)).toBeNull();
    }
    expect(sourceHref({ type: 'speaker', id: 'a', title: 't' }, mergeFeatures({ schedule: false }))).not.toBeNull();
  });
});
