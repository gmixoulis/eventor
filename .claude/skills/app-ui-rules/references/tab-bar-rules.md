# Persistent bottom tab bar: rules

## Scope
- The bar stays visible on every screen, including pushed screens: Schedule, People, Speakers, Sponsors, Map, Passport, Side events, Account, and all detail pages.
- The user once got lost with no way back to Home, so any change that hides the bar on a normal screen is a regression.
- Hide the bar only on full-screen flows: welcome, sign-in, onboarding and its steps, reels, announcements, and while the keyboard is open.
- The visitor "Sign in to continue" gate is a normal screen, so the bar stays visible on it. A visitor must always be able to reach Home from a gate.

## Structure
- Render one TabBar in the root layout, below the Stack in a column.
- Do not rely on the (tabs) navigator's own bar, which disappears on pushed screens. Hide it, so there is never a second bar or a flicker during a push.
- The bar owns the bottom safe-area inset. Pinned footers (Reserve, Save, the Map List button) sit directly above it with no double gap.

## Switching tabs
- Tapping a tab from a pushed screen returns to that tab and dismisses the stack above it, so Back does not walk through old screens. Tapping the active tab on a pushed screen also returns to it.
- Between two tabs, switch with `router.navigate`. `router.dismissTo` does nothing inside the (tabs) navigator, which has no pop-to action. That bug shipped in v0.2.0 and v0.3.0: the bar vibrated and the screen stayed. Use `dismissTo` only from a pushed screen.
- Route both through the pure `tabSwitch(pathname, path)` in `src/components/tabs.ts`, which returns `'none'`, `'jump'`, or `'pop'`. The visitor gate's "Back to Home" uses the same switch, since it fails the same way on a locked tab.

## Active-tab highlight
- The highlight must match the route segment, not the pathname. In expo-router the Schedule and Networking tabs also report the path "/", so matching on pathname lit Home on them in the side menu.
- Add a test for that case in `src/components/tabs.ts`.

## Testing
- Keep the hide rule and the active-tab rule as pure functions in `src/components/tabs.ts`, with tests.
- Check on the device in light and dark mode: open a pushed screen, confirm the bar is there, and confirm a tab switch works.
