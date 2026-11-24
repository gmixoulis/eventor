import { matchesPrefix } from '@/lib/paths';

/**
 * Route prefixes a guest may not open. The layout guard and the sign-in-required
 * handler both read this list, so it stays in one place.
 */
export const SIGNED_IN_ONLY_PREFIXES = [
  '/people',
  '/person',
  '/my-schedule',
  '/qr',
  '/chat',
  '/account',
  '/onboarding',
  '/organizer',
  '/passport',
  '/ask',
  '/tickets',
] as const;

/** Re-exported so existing imports keep working; the pure helper lives in @/lib/paths. */
export { matchesPrefix };

/** True when `pathname` is a signed-in-only route or a nested route under one. */
export function isSignedInOnlyRoute(pathname: string): boolean {
  return matchesPrefix(pathname, SIGNED_IN_ONLY_PREFIXES);
}

/** Who may open Organizer tools: the app admin, or a sub-admin of at least one side event. */
export type OrganizerRole = { isAdmin: boolean; isSubAdmin: boolean };

/** Organizer screens a sub-admin may open; every other one under /organizer is admin-only. */
const SUB_ADMIN_PATHS = ['/organizer/requests'] as const;

/** True when the role may open `pathname`; routes outside /organizer are not judged here. */
export function isOrganizerRouteAllowed(pathname: string, role: OrganizerRole): boolean {
  if (!matchesPrefix(pathname, ['/organizer']) || role.isAdmin) return true;
  return role.isSubAdmin && (pathname === '/organizer' || matchesPrefix(pathname, SUB_ADMIN_PATHS));
}

/**
 * A `next` redirect target is used only when it is a single in-app path: one leading "/", not "//",
 * no backslashes and no whitespace. Anything else (a URL with a protocol, a repeated query
 * param array, or any non-string) becomes "/".
 */
export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return '/';
  // URL parsers drop tabs and newlines and read "\" as "/", so either could turn "/\host" into "//host".
  if (/[\\\s]/.test(next)) return '/';
  return next;
}

/**
 * The path a root Stack screen stands for, from its route name ("person/[id]" -> "/person/[id]").
 * A route group such as "(tabs)" stands for its focused child, "index" when nothing is focused yet.
 * Good enough for prefix checks like isSignedInOnlyRoute; use usePathname() for a real `next` target.
 */
export function screenPath(routeName: string, focusedChild?: string): string {
  if (/^\(.*\)$/.test(routeName)) {
    const child = focusedChild ?? 'index';
    return child === 'index' ? '/' : `/${child}`;
  }
  return `/${routeName}`;
}

/** The route group that hosts the bottom tabs; its focused child decides privacy, not the group as a whole. */
export const TABS_GROUP = '(tabs)';

/**
 * The path the visitor gate should judge. The `path` prop is a screenPath snapshot of the focused child,
 * which goes stale when the focused tab changes without re-rendering the screen layout. While a tab is the
 * current route (segments start with the tabs group) the live pathname is used instead, so a visitor who
 * deep-links to a private tab is still gated. A pushed screen keeps its own static path, so a private screen
 * above a public tab never makes the tab underneath gate itself.
 */
export function gatePath(path: string, pathname: string, segments: readonly string[]): string {
  return segments[0] === TABS_GROUP ? pathname : path;
}
