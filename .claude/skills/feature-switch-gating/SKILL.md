---
name: feature-switch-gating
description: Use when adding or editing feature on/off switches.
category: navigation
---

# Feature switches hide every entry point

A switched-off feature must be unreachable from every place that can open it, not only from the route it owns. Gate at the source of each entry point, then prove it.

- Before calling a switch done, grep the owned path prefix across `src/app` and `src/components` (`router.push`, `router.navigate`, `href`, `Link`) and gate every hit: Menu tile, Home section (`visibleSections`), tab slot (`tabsForMode`), chat circle (`showsAskFab` in `src/components/tabs.ts`, given the merged flags; `ask-fab.tsx` must not AND `flags.ask` at its call site), search categories, and in-screen buttons or cards. A Leaderboard button or a meeting card that pushes `/chat` stays live when its own switch is off.
- Test the direct-link path too. A switched-off route must render the "Not available" screen with Back to Home, through the root Stack `screenLayout` next to the visitor gate.
- Keep the gate rules (merge, parent-child, which feature owns a path) in one pure function with unit tests. A flag check added inline at a call site is untested and drifts from the helper.
- A child whose parent is off stays visible but greyed with "needs <parent>", so the rule belongs in the pure helper.
- Feature switches and the event setup are device-level since 22-11-26 (`db.device`, read through `normalizeDevice`), so every account and visitors on the phone follow them; other settings stay per account (`db.states[accountId].settings`). A new switch-like setting belongs in `db.device` unless the owner says it is personal.
- Hiding blocks behind a build or tenant switch can empty a screen. After you hide a block, check the screen still shows content in that build (name, actions, or a stated empty state). A hidden block can also be the only home of a field: when About was hidden, the speaker job title disappeared from the profile everywhere. Before hiding a block, list the fields it alone shows and move any that no other block keeps. The profile screen in the event build showed only the avatar because every remaining block was hidden.
- Keep every toggle and link at 44 pt or more in both themes.
- Prove a switch on the device, then restore it: turn one switch off, read the Menu, open a direct link to its route, and expect "Not available". Put back the state the owner had set before you finish; switches are device-wide, so a leftover change shows up for the next session on that phone.
- The toggles screen saves only on "Save Changes". A tap on the "Disable Feature" confirmation can miss and save nothing, so reopen the screen and read the state. Count a switch as off only when the tab or menu entry is gone and the backend logged `PUT /admin/config/feature_flags 200`.
- A switch that changes which vendor answers (an env var such as `ASSISTANT_MODEL_PROVIDER`) must not leave user-visible copy naming a vendor. Do not keep vendor names accurate per value: the owner ruled on 22-11-26 that DeepSeek and China come out of the Ask copy entirely, so no line goes stale when the provider changes. Note the ruling in the plan.
- Free-text setup rules that switch features off (negation such as "no sponsors or speakers" or "without the map, guide and passport") end their list at the first word that is not a feature name. "No networking and a big sponsor expo" turns off People only and keeps Sponsors on. A rule that carries "no" across the whole clause over-reaches; the first delegated version did exactly that. Every such rule needs an over-reach sentence in its unit tests, asserting the features after the list stay on.
- A chat or natural-language switch request is a write too. Read the stored value first. If the request changes nothing, say the feature is already in that state and do not show a "Turned on" confirmation. Compare the proposal with the stored state before it is shown.
- Server side, every writer of switch values goes through `PUT /admin/config/{key}`, never straight to the `AppConfig` row. That path runs the shared-mode lock (`SHARED_MODE_LOCKED` in `app/core/feature_flags.py`, rejected with 422 `feature_locked`) and `apply_cascade`, so a new writer such as an AI chat, an import or a preset must call it to inherit both. The lock set is tickets, ai_portraits, ai_summaries and live_captions; the registry holds 26 flags. Re-check these line numbers in the backend before you cite them.
