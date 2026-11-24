import type { Href } from 'expo-router';

import { matchesPrefix } from '@/components/auth/routes';
import { isPathEnabled, mergeFeatures, type FeatureFlags } from '@/lib/features';

/** The MaterialCommunityIcons glyphs used by the tab bar. */
export type TabIconName = 'home' | 'calendar-check' | 'map' | 'qrcode' | 'menu';

/** One tab bar entry, rendered as a single direct `<Tabs.Screen>`. */
export type TabSpec = {
  /** Route name inside the `(tabs)` group. */
  name: string;
  /** Label shown under the icon. */
  title: string;
  /** Icon glyph. */
  icon: TabIconName;
  /** Hide the tab entirely (rendered as `href: null`). */
  hidden: boolean;
  /** Non-tab route the tab links to, or `null` to open the route named above. */
  target: Href | null;
};

/**
 * The ordered tab list for a mode. The middle two slots always use the same
 * `name`s (`my-schedule`, `qr`) so every `<Tabs.Screen>` is a stable direct
 * child; guests repoint them at `/schedule` and `/map` via `target`.
 */
export function tabsForMode(isGuest: boolean, flags: FeatureFlags = mergeFeatures()): TabSpec[] {
  const tabs: TabSpec[] = isGuest
    ? [
        { name: 'index', title: 'Event Home', icon: 'home', hidden: false, target: null },
        { name: 'my-schedule', title: 'Schedule', icon: 'calendar-check', hidden: false, target: '/schedule' },
        { name: 'qr', title: 'Map', icon: 'map', hidden: false, target: '/map' },
        { name: 'menu', title: 'Menu', icon: 'menu', hidden: false, target: null },
      ]
    : [
        { name: 'index', title: 'Event Home', icon: 'home', hidden: false, target: null },
        { name: 'my-schedule', title: 'My Schedule', icon: 'calendar-check', hidden: false, target: null },
        { name: 'qr', title: 'QR Code', icon: 'qrcode', hidden: false, target: null },
        { name: 'menu', title: 'Menu', icon: 'menu', hidden: false, target: null },
      ];
  // A switched-off feature hides the tab that shows it; the route stays registered in the (tabs) group.
  return tabs.map((tab) => ({ ...tab, hidden: !isPathEnabled(tabPath(tab), flags) }));
}

/** The pathname a tab shows: its `target` when it has one, else its route inside the `(tabs)` group. */
export function tabPath(tab: TabSpec): string {
  // Targets are plain paths today; an object Href would fall back to the tab's own route.
  if (typeof tab.target === 'string') return tab.target;
  return tab.name === 'index' ? '/' : `/${tab.name}`;
}

/** Paths of the routes inside the `(tabs)` group; on these the root stack's top screen is the tab navigator. */
const GROUP_PATHS = ['/', '/my-schedule', '/qr', '/menu'];

/**
 * How to get from `pathname` to the tab at `path`. 'jump' switches between two routes of the `(tabs)` group: the
 * tab navigator has no "pop to" action, so router.dismissTo does nothing there. 'pop' goes through the root stack
 * (from or to a pushed screen), and 'none' means the tab is already showing.
 */
export function tabSwitch(pathname: string, path: string): 'none' | 'jump' | 'pop' {
  if (path === pathname) return 'none';
  return GROUP_PATHS.includes(path) && GROUP_PATHS.includes(pathname) ? 'jump' : 'pop';
}

/** The tab whose path is exactly `pathname`, or null on any other screen (the bar then keeps the last one). */
export function activeTabFor(pathname: string, tabs: TabSpec[]): string | null {
  return tabs.find((tab) => !tab.hidden && tabPath(tab) === pathname)?.name ?? null;
}

/** Full-screen flows that hide the bar, matched with their nested routes. */
export const TAB_BAR_HIDDEN_PREFIXES = ['/welcome', '/sign-in', '/onboarding', '/reels', '/announcements'] as const;

/** True on routes where the persistent bar steps aside (the keyboard is handled by the bar itself). */
export function hidesTabBar(pathname: string): boolean {
  return matchesPrefix(pathname, TAB_BAR_HIDDEN_PREFIXES);
}

/**
 * Routes where the floating ask circle would sit on a control or a pinned footer, or is redundant:
 * the chat itself, the maps (own bottom controls), /guide (bottom-left pill), /qr (result card),
 * the Reserve and Save footers of /session and /side-event, the leaderboard rank footer, the chat input bar,
 * the /activity form sheet, and the organizer tools (it covered the Ask switch row).
 */
const ASK_FAB_HIDDEN_PREFIXES = [
  '/ask', '/map', '/guide', '/qr', '/session', '/side-event', '/passport/leaderboard', '/chat', '/activity', '/organizer',
] as const;

/** True when the ask circle shows: the ask feature is on, signed in, tab bar present, and no control of the screen underneath. Keyboard is checked by the caller. */
export function showsAskFab(pathname: string, isGuest: boolean, flags: FeatureFlags = mergeFeatures()): boolean {
  if (!flags.ask || isGuest || hidesTabBar(pathname)) return false;
  return !matchesPrefix(pathname, ASK_FAB_HIDDEN_PREFIXES);
}
