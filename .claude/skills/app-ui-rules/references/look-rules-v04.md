# Visual look: v0.4 rules

## Colour
- Blue (`colors.primary`) only for buttons, links, the active tab, checkmarks, and switches. Never for labels, pills, hero cards, or decoration.
- Second colours (red, pink, yellow from the welcome art) are fills on Home, section markers, and empty states. Never text on white. Text on them uses the on-art colour, at WCAG AA in both themes.
- Decorative art and empty states use the art palette (`artYellow` fills, `onArt` strokes, `artRed` accents), never primary.
- Name a pill tone for what it renders: `neutral` for ink on grey, `ink` for text on the page colour. Before removing a theme token, grep `src` and the contrast tests for it.

## Layout
- Lists are plain full-width rows with dividers. A card only for one tappable block with its own actions.
- A two-column tile grid is not a list. Its dividers stop at half width, so use full-width rows instead.
- Three levels of emphasis (page title, section, row) through size and spacing, not boxes.
- Pills for status only (Live, Full, Ended, Pending, waitlist). Type, direction, and "Top match" become plain text or go.
- Remove helper sentences under headings unless the screen is unclear without them. Keep only the demo note on the sign-in screen.
- Sentence case. Typefaces stay as set in the theme.

## Touch and text size
- Touch targets are at least 44 pt. Check the size style or `hitSlop` in the code, not the screenshot. A 32 pt icon button looks right and fails.
- Check the large-text setting (130%) before calling a screen done. Fixed widths break time labels: "10:00 AM" wrapped mid-word in a 72 pt column on Home and a 48 pt column on My Schedule. Use `minWidth` so the column grows, and keep the time on one line.

## Rollout
- Restyle Home, Menu, Schedule, and People first. Capture before and after screenshots in light and dark, and wait for the owner before restyling other screens.
- A subagent's "gates pass" is not visual proof. Re-run typecheck, lint, and jest yourself, and say the device look is unchecked until screenshots exist.
- After a parallel restyle, grep `colors.primary` under `src` (tsx files) and move every non-action use (labels, overlines, decorative fills) to neutral text or an art colour.
- Grep component declarations too, not only call sites. A shared art component with a default prop such as `color = colors.primary` keeps blue on screens that never pass the prop. The v0.4 rollout found a MeanderLine like this.
- Before deleting a style, grep its users. An unused `overline` or `card` style is dead code.
- Report the `colors.primary` count before and after the rollout. v0.4: 162 to 99, the remainder being buttons, links, and switches.
- Plan of record: `process/features/v04-look-toggles-setup/active/v04_PLAN_21-11-26.md`.
