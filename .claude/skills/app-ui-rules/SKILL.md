---
name: app-ui-rules
description: Use when restyling screens or editing the bottom tab bar.
category: ui-design
---

Project UI rules: blue marks actions only, lists are plain rows, pills mark status only, and the bottom tab bar stays on every screen. Restyle in stages, and the owner judges each stage before the next.

## Look
- Blue (`colors.primary`) is for actions only: buttons, links, the active tab, checkmarks, and switches.
- Lists are plain full-width rows with dividers. A card is for one tappable block with its own actions. Pills are for status only.
- Touch targets are at least 44 pt, checked in the code. Large text (130%) must not wrap time labels.
- Restyle Home, Menu, Schedule, and People first, with before and after screenshots in light and dark. Wait for the owner before other screens.
- Full rules, grep checks, and the v0.4 colour count: `references/look-rules-v04.md`.

## Persistent tab bar
- The bar stays visible on every screen, including pushed screens. Hiding it on a normal screen is a regression.
- Render one TabBar in the root layout, below the Stack. The Tabs navigator's own bar stays hidden.
- Route tab switches through the pure `tabSwitch` helper in `src/components/tabs.ts`. Between two tabs use `router.navigate`; `router.dismissTo` works only from a pushed screen.
- Hide the bar only on full-screen flows and while the keyboard is open. Keep the hide rule and the active-tab rule as pure functions with tests.
- Check on a device in light and dark: open a pushed screen, confirm the bar is there, and confirm a tab switch works.
- Full rules and the bugs behind them: `references/tab-bar-rules.md`.
