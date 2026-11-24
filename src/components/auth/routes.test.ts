import { describe, expect, it } from '@jest/globals';

import { gatePath, isOrganizerRouteAllowed, isSignedInOnlyRoute, safeNext, screenPath } from '@/components/auth/routes';

describe('screenPath', () => {
  it('turns stack route names into paths', () => {
    expect(screenPath('people')).toBe('/people');
    expect(screenPath('person/[id]')).toBe('/person/[id]');
    expect(screenPath('account/index')).toBe('/account/index');
  });

  it('maps a route group to its focused child', () => {
    expect(screenPath('(tabs)')).toBe('/');
    expect(screenPath('(tabs)', 'index')).toBe('/');
    expect(screenPath('(tabs)', 'my-schedule')).toBe('/my-schedule');
  });

  it('feeds the private-route check for nested and dynamic screens', () => {
    expect(isSignedInOnlyRoute(screenPath('person/[id]'))).toBe(true);
    expect(isSignedInOnlyRoute(screenPath('account/index'))).toBe(true);
    expect(isSignedInOnlyRoute(screenPath('(tabs)', 'qr'))).toBe(true);
    expect(isSignedInOnlyRoute(screenPath('(tabs)', 'menu'))).toBe(false);
    expect(isSignedInOnlyRoute(screenPath('session/[id]'))).toBe(false);
    expect(isSignedInOnlyRoute(screenPath('ask'))).toBe(true);
  });
});

describe('safeNext', () => {
  it('keeps a single in-app path', () => {
    expect(safeNext('/people')).toBe('/people');
    expect(safeNext('/account')).toBe('/account');
  });

  it('falls back to Home for a repeated query param array', () => {
    expect(safeNext(['/people', '/account'])).toBe('/');
  });

  it('falls back to Home for non-string values', () => {
    expect(safeNext(42)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext({ next: '/people' })).toBe('/');
  });
});

describe('gatePath', () => {
  it('follows the live pathname while a tab is the current route', () => {
    // Deep-link to a private tab: the group `path` snapshot can be stale, the pathname is not.
    expect(gatePath('/', '/my-schedule', ['(tabs)', 'my-schedule'])).toBe('/my-schedule');
    // Back on a public tab, the stale private snapshot must not keep gating.
    expect(gatePath('/my-schedule', '/', ['(tabs)'])).toBe('/');
  });

  it('keeps a pushed screen on its own static path, not the tab underneath', () => {
    expect(gatePath('/person/[id]', '/person/5', ['person', '[id]'])).toBe('/person/[id]');
    expect(gatePath('/', '/person/5', ['person', '[id]'])).toBe('/');
  });

  it('is robust when no route has resolved yet', () => {
    expect(gatePath('/menu', '/menu', [])).toBe('/menu');
  });
});


describe('organizer route rule', () => {
  const admin = { isAdmin: true, isSubAdmin: false };
  const subAdmin = { isAdmin: false, isSubAdmin: true };
  const attendee = { isAdmin: false, isSubAdmin: false };

  it('opens every organizer tool to the admin', () => {
    for (const path of ['/organizer', '/organizer/admins', '/organizer/features', '/organizer/requests']) {
      expect(isOrganizerRouteAllowed(path, admin)).toBe(true);
    }
  });

  it('gives a sub-admin the tools page and Requests only', () => {
    expect(isOrganizerRouteAllowed('/organizer', subAdmin)).toBe(true);
    expect(isOrganizerRouteAllowed('/organizer/requests', subAdmin)).toBe(true);
    for (const path of ['/organizer/admins', '/organizer/features', '/organizer/setup', '/organizer/stats', '/organizer/suggest']) {
      expect(isOrganizerRouteAllowed(path, subAdmin)).toBe(false);
    }
  });

  it('keeps an attendee out of every organizer tool and judges nothing else', () => {
    expect(isOrganizerRouteAllowed('/organizer', attendee)).toBe(false);
    expect(isOrganizerRouteAllowed('/organizer/requests', attendee)).toBe(false);
    expect(isOrganizerRouteAllowed('/organizers', attendee)).toBe(true);
    expect(isOrganizerRouteAllowed('/side-event/se-pitch-clinic', attendee)).toBe(true);
  });
});
