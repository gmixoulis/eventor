---
name: event-countdown-day-labels
description: Use when editing a countdown, the hero countdown, "Doors open today", today/tomorrow day labels, or Intl date formatting in React Native.
category: ui-copy
---

# Day-relative labels use calendar days in the event timezone

Compare the calendar day of the target time with the calendar day of now, both in the event's timezone (Europe/New York for this festival). Do not compare elapsed hours.

- "Today" means the same calendar day. A session at 02:00 is not "today" at 22:00 the evening before.
- "Tomorrow" means the next calendar day in that timezone.
- Format the date part in the event timezone too, so a device in another zone shows the same label.
- Cover the boundary with a test: 23:59 and 00:01 across midnight, and a device timezone different from the event timezone.
- When the rule changes, grep the test file for cases that encode the old behaviour (for example an expected `days: 0` for a start under 24 hours away) and rewrite them in the new rule's terms. A stale case that still passes hides the bug.
- Pin test inputs as UTC instants (`...Z`) and leave the process timezone alone, so the result cannot depend on the machine's zone.
- A countdown or "happening now" label must refresh on its own: keep `now` in state, tick it about every 60 s, and refresh on AppState `active`. Computing `new Date()` only at render leaves "Doors open today" showing after the doors open. Test the crossing with fake timers.
- Do not call `Intl.DateTimeFormat(...).formatToParts` to get the New York day in app code. Hermes support is not guaranteed, and a missing part throws during render. Use explicit UTC arithmetic instead: New York is UTC+3 from the last Sunday of March 01:00 UTC to the last Sunday of October 01:00 UTC, otherwise UTC+2. Mark the hardcoded rule with a `shortcut:` comment naming when to switch back to Intl.
- Cover the October change too: 2026-10-25T22:30:00Z is 00:30 on 26 Oct in New York (day 0 for a 26 Oct start).
