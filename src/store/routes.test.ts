import { describe, expect, it } from '@jest/globals';

import { isSignedInOnlyRoute, safeNext } from '@/components/auth/routes';

describe('signed-in-only route matcher', () => {
  it('matches an exact prefix', () => {
    expect(isSignedInOnlyRoute('/people')).toBe(true);
    expect(isSignedInOnlyRoute('/account')).toBe(true);
    expect(isSignedInOnlyRoute('/my-schedule')).toBe(true);
  });

  it('matches nested routes under a prefix', () => {
    expect(isSignedInOnlyRoute('/person/5')).toBe(true);
    expect(isSignedInOnlyRoute('/account/cache')).toBe(true);
    expect(isSignedInOnlyRoute('/chat/abc')).toBe(true);
  });

  it('keeps guests out of the organizer tools', () => {
    expect(isSignedInOnlyRoute('/organizer')).toBe(true);
    expect(isSignedInOnlyRoute('/organizer/suggest')).toBe(true);
  });

  it('keeps guests out of the passport', () => {
    expect(isSignedInOnlyRoute('/passport')).toBe(true);
    expect(isSignedInOnlyRoute('/passport/leaderboard')).toBe(true);
    expect(isSignedInOnlyRoute('/passport/share')).toBe(true);
    expect(isSignedInOnlyRoute('/passports')).toBe(false);
  });

  it('allows guest routes', () => {
    expect(isSignedInOnlyRoute('/schedule')).toBe(false);
    expect(isSignedInOnlyRoute('/session/s-opening')).toBe(false);
    expect(isSignedInOnlyRoute('/map')).toBe(false);
    expect(isSignedInOnlyRoute('/speakers')).toBe(false);
    expect(isSignedInOnlyRoute('/')).toBe(false);
  });
});

describe('safeNext redirect target', () => {
  it('keeps an internal path, with or without a query string', () => {
    expect(safeNext('/person/5')).toBe('/person/5');
    expect(safeNext('/schedule?day=2026-05-28')).toBe('/schedule?day=2026-05-28');
  });

  it('rejects external and script targets', () => {
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('javascript:alert(1)')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext('/\t/evil.example')).toBe('/');
  });

  it('falls back to home when empty', () => {
    expect(safeNext('')).toBe('/');
    expect(safeNext(undefined)).toBe('/');
  });
});
