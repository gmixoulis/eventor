import { describe, expect, it } from '@jest/globals';

import { homeSections, type HomeSection } from '@/lib/home-layout';

const KNOWN: HomeSection[] = [
  'ticket',
  'up-next',
  'near-now',
  'matches',
  'recommended',
  'pitches',
  'side-events',
  'passport',
  'speakers',
  'word',
  'banners',
];

describe('homeSections', () => {
  it.each(['Startup', 'Investor', 'Corporate', 'Media', 'Guest', 'Unknown'])(
    '%s returns each key at most once and only known keys',
    (role) => {
      const sections = homeSections(role);
      expect(new Set(sections).size).toBe(sections.length);
      for (const key of sections) expect(KNOWN).toContain(key);
      expect(sections.slice(-2)).toEqual(['banners', 'word']);
    },
  );

  it('puts matches before pitches for a founder', () => {
    const sections = homeSections('Startup');
    expect(sections.indexOf('matches')).toBeLessThan(sections.indexOf('pitches'));
  });
});
