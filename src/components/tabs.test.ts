import { describe, expect, it } from '@jest/globals';

import { activeTabFor, hidesTabBar, showsAskFab, tabPath, tabSwitch, tabsForMode } from '@/components/tabs';
import { mergeFeatures } from '@/lib/features';

describe('tabsForMode', () => {
  it('shows the four signed-in tabs in order', () => {
    const tabs = tabsForMode(false);
    expect(tabs.map((t) => t.name)).toEqual(['index', 'my-schedule', 'qr', 'menu']);
    expect(tabs.map((t) => t.title)).toEqual(['Event Home', 'My Schedule', 'QR Code', 'Menu']);
    expect(tabs.map((t) => t.target)).toEqual([null, null, null, null]);
    expect(tabs.every((t) => !t.hidden)).toBe(true);
  });

  it('shows the four guest tabs with Schedule and Map repointed', () => {
    const tabs = tabsForMode(true);
    expect(tabs.map((t) => t.name)).toEqual(['index', 'my-schedule', 'qr', 'menu']);
    expect(tabs.map((t) => t.title)).toEqual(['Event Home', 'Schedule', 'Map', 'Menu']);
    expect(tabs.map((t) => t.target)).toEqual([null, '/schedule', '/map', null]);
    expect(tabs.every((t) => !t.hidden)).toBe(true);
  });

  it('hides the tab of a switched-off feature and keeps all four registered', () => {
    const hidden = (isGuest: boolean, overrides: Parameters<typeof mergeFeatures>[0]) =>
      tabsForMode(isGuest, mergeFeatures(overrides)).filter((t) => t.hidden).map((t) => t.name);
    expect(hidden(false, { qrCode: false })).toEqual(['qr']);
    expect(hidden(false, { schedule: false })).toEqual(['my-schedule']);
    expect(hidden(true, { map: false })).toEqual(['qr']);
    expect(hidden(true, { qrCode: false, mySchedule: false })).toEqual([]);
    expect(tabsForMode(false, mergeFeatures({ qrCode: false }))).toHaveLength(4);
  });
});

describe('tabPath', () => {
  it('maps signed-in tabs to their group routes', () => {
    expect(tabsForMode(false).map(tabPath)).toEqual(['/', '/my-schedule', '/qr', '/menu']);
  });

  it('uses the guest targets', () => {
    expect(tabsForMode(true).map(tabPath)).toEqual(['/', '/schedule', '/map', '/menu']);
  });
});

describe('tabSwitch', () => {
  it('jumps between two tabs, because the tab navigator ignores a stack pop', () => {
    expect(tabSwitch('/', '/menu')).toBe('jump');
    expect(tabSwitch('/menu', '/my-schedule')).toBe('jump');
    expect(tabSwitch('/my-schedule', '/qr')).toBe('jump');
    expect(tabSwitch('/qr', '/')).toBe('jump');
  });

  it('pops the root stack from a pushed screen back to a tab', () => {
    expect(tabSwitch('/ask', '/')).toBe('pop');
    expect(tabSwitch('/session/s1', '/menu')).toBe('pop');
    expect(tabSwitch('/schedule', '/')).toBe('pop');
  });

  it('pops to a guest tab that is a pushed screen', () => {
    expect(tabSwitch('/', '/schedule')).toBe('pop');
    expect(tabSwitch('/schedule', '/map')).toBe('pop');
  });

  it('does nothing on the tab that is already showing', () => {
    expect(tabSwitch('/', '/')).toBe('none');
    expect(tabSwitch('/menu', '/menu')).toBe('none');
    expect(tabSwitch('/map', '/map')).toBe('none');
  });

  it('treats every signed-in tab route as part of the tabs group', () => {
    const paths = tabsForMode(false).map(tabPath);
    for (const from of paths) {
      for (const to of paths) expect(tabSwitch(from, to)).toBe(from === to ? 'none' : 'jump');
    }
  });
});

describe('activeTabFor', () => {
  it('matches a tab route exactly', () => {
    expect(activeTabFor('/', tabsForMode(false))).toBe('index');
    expect(activeTabFor('/qr', tabsForMode(false))).toBe('qr');
    expect(activeTabFor('/map', tabsForMode(true))).toBe('qr');
    expect(activeTabFor('/schedule', tabsForMode(true))).toBe('my-schedule');
  });

  it('returns null on pushed screens, including a guest target seen while signed in', () => {
    expect(activeTabFor('/people', tabsForMode(false))).toBeNull();
    expect(activeTabFor('/session/s1', tabsForMode(false))).toBeNull();
    expect(activeTabFor('/schedule', tabsForMode(false))).toBeNull();
    expect(activeTabFor('/menu/extra', tabsForMode(false))).toBeNull();
  });
});

describe('hidesTabBar', () => {
  it('hides on full-screen flows and their nested routes', () => {
    for (const path of ['/welcome', '/sign-in', '/onboarding', '/onboarding/goals', '/reels', '/announcements']) {
      expect(hidesTabBar(path)).toBe(true);
    }
  });

  it('shows on tabs and pushed screens, without matching on a shared prefix', () => {
    for (const path of ['/', '/my-schedule', '/people', '/session/s1', '/account', '/activity', '/reelsx', '/sign-inside']) {
      expect(hidesTabBar(path)).toBe(false);
    }
  });
});

describe('showsAskFab', () => {
  it('shows on signed-in tabs and plain pushed screens', () => {
    for (const path of ['/', '/my-schedule', '/menu', '/schedule', '/people', '/speakers', '/account', '/passport', '/search', '/mapx']) {
      expect(showsAskFab(path, false)).toBe(true);
    }
  });

  it('never shows to a visitor', () => {
    expect(showsAskFab('/', true)).toBe(false);
  });

  it('hides where the tab bar hides', () => {
    for (const path of ['/welcome', '/sign-in', '/onboarding', '/onboarding/goals', '/reels', '/announcements']) {
      expect(showsAskFab(path, false)).toBe(false);
    }
  });

  it('hides on the chat, maps and screens with a bottom control or pinned footer', () => {
    const covered = ['/ask', '/map', '/guide', '/qr', '/session/s1', '/side-event/se1', '/passport/leaderboard', '/chat/c1', '/activity'];
    for (const path of covered) expect(showsAskFab(path, false)).toBe(false);
  });

  it('hides on the organizer tools and their sub-routes', () => {
    for (const path of ['/organizer', '/organizer/features', '/organizer/setup', '/organizer/stats']) {
      expect(showsAskFab(path, false)).toBe(false);
    }
    expect(showsAskFab('/organizerx', false)).toBe(true);
  });

  it('hides everywhere when the ask feature switch is off', () => {
    for (const path of ['/', '/my-schedule', '/menu', '/schedule', '/people', '/speakers', '/account']) {
      expect(showsAskFab(path, false, mergeFeatures({ ask: false }))).toBe(false);
    }
  });

  it('still follows every existing rule when the ask feature is on', () => {
    expect(showsAskFab('/', false, mergeFeatures({ ask: true }))).toBe(true);
    expect(showsAskFab('/', true, mergeFeatures({ ask: true }))).toBe(false);
    expect(showsAskFab('/ask', false, mergeFeatures({ ask: true }))).toBe(false);
    expect(showsAskFab('/organizer', false, mergeFeatures({ ask: true }))).toBe(false);
  });
});
