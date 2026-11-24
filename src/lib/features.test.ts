import { describe, expect, it } from '@jest/globals';

import { FEATURES, featureForPath, isPathEnabled, mergeFeatures, withFeature } from '@/lib/features';

describe('mergeFeatures', () => {
  it('turns every feature on by default', () => {
    const flags = mergeFeatures();
    expect(Object.keys(flags)).toHaveLength(17);
    expect(Object.values(flags).every(Boolean)).toBe(true);
    expect(mergeFeatures({})).toEqual(flags);
  });

  it('applies overrides and ignores values that are not booleans', () => {
    const flags = mergeFeatures({ sponsors: false, guide: 'no', map: true });
    expect(flags.sponsors).toBe(false);
    expect(flags.guide).toBe(true);
    expect(flags.map).toBe(true);
  });

  it('turns a child off when its parent is off, even when the child is saved as on', () => {
    expect(mergeFeatures({ passport: false }).leaderboard).toBe(false);
    expect(mergeFeatures({ passport: false, leaderboard: true }).leaderboard).toBe(false);
    expect(mergeFeatures({ people: false }).meetings).toBe(false);
    expect(mergeFeatures({ schedule: false }).mySchedule).toBe(false);
    expect(mergeFeatures({ sideEvents: false }).sideEventRequests).toBe(false);
    expect(mergeFeatures({ leaderboard: false }).passport).toBe(true);
  });

  it('lists every parent before its children', () => {
    const seen = new Set<string>();
    for (const feature of FEATURES) {
      for (const parent of feature.dependsOn) expect(seen.has(parent)).toBe(true);
      seen.add(feature.id);
    }
  });
});

describe('withFeature', () => {
  it('saves only what differs from the default', () => {
    expect(withFeature({}, 'sponsors', false)).toEqual({ sponsors: false });
    expect(withFeature({ sponsors: false, guide: false }, 'sponsors', true)).toEqual({ guide: false });
  });
});

describe('featureForPath', () => {
  it('finds the owner of a screen and its nested routes', () => {
    expect(featureForPath('/schedule')).toBe('schedule');
    expect(featureForPath('/session/s1')).toBe('schedule');
    expect(featureForPath('/person/p1')).toBe('people');
    expect(featureForPath('/chat/p1')).toBe('meetings');
    expect(featureForPath('/map')).toBe('map');
    expect(featureForPath('/qr')).toBe('qrCode');
    expect(featureForPath('/tickets')).toBe('tickets');
    expect(featureForPath('/tickets/checkout')).toBe('tickets');
    expect(featureForPath('/tickets/tkt-1')).toBe('tickets');
  });

  it('gives a nested route to the most specific feature', () => {
    expect(featureForPath('/passport/leaderboard')).toBe('leaderboard');
    expect(featureForPath('/passport/share')).toBe('passport');
    expect(featureForPath('/passport')).toBe('passport');
    expect(featureForPath('/organizer/requests')).toBe('sideEventRequests');
    expect(featureForPath('/organizer/admins')).toBe('sideEventRequests');
  });

  it('matches whole path segments only', () => {
    expect(featureForPath('/sessions-x')).toBeNull();
    expect(featureForPath('/asked')).toBeNull();
  });

  it('leaves always-on screens without an owner', () => {
    for (const path of ['/', '/menu', '/search', '/account', '/sign-in', '/organizer', '/organizer/features']) {
      expect(featureForPath(path)).toBeNull();
    }
  });
});

describe('isPathEnabled', () => {
  it('follows the merged flags and keeps unknown paths enabled', () => {
    const flags = mergeFeatures({ passport: false });
    expect(isPathEnabled('/passport', flags)).toBe(false);
    expect(isPathEnabled('/passport/leaderboard', flags)).toBe(false);
    expect(isPathEnabled('/schedule', flags)).toBe(true);
    expect(isPathEnabled('/nowhere', flags)).toBe(true);
  });
});
