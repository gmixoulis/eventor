---
name: demo-simulated-location
description: Use when adding GPS, location, or a simulated event clock to a demo or emulator.
category: mobile-tooling
---

# Demo-simulated location and sensor sources

Every sensor-driven feature ships with a labelled simulated source that the presenter can switch on from the feature's own readout. A demo must never depend on real GPS being good.

- **One typed source.** Model the position as `'gps' | 'manual' | 'checkpoint' | 'simulated'` and read it through a single resolver. Puck, readout and route start consume the resolver, never the raw GPS fix. Unit-test the resolver.
- **Simulated means a known anchor.** Place the simulated user at a stated point (the main entrance) with a stated accuracy, for example 6 m. Offer a route walk at a chosen speed so directions can be shown moving.
- **Simulated clock is a second source.** Read `now` from one clock hook that holds its value between ticks. Never create a fresh `Date` in render or in an effect dependency, or the effect re-runs on every render. Convert event wall time with the event's own timezone, not the device's, and cover that conversion with a test that does not depend on the machine's timezone. Presets jump the clock to a stated moment, and the Simulated tag applies to the clock as well. A clock anchor saved to storage must restart at its preset on every session load (cold start, reset, sign-in, account switch); otherwise the first launch's time sticks and days later every event reads "Ended". Test that a stale saved anchor restarts, not only that a fresh one works.
- **Always visible.** While simulated, show a "Simulated" tag in the warning colour on every screen that uses the position. Nobody may mistake it for a real fix.
- **Verify on the emulator.** Feed the fix with `adb -s <serial> emu geo fix <longitude> <latitude>` and check the screenshot. Real accuracy is untested until a phone run; say so in the report.
- **Check the installed build before a showcase.** Confirm the emulator runs the build that contains the feature (the new screen or control is visible) before testing location. A committed feature is not on the emulator until the APK is rebuilt and installed. If the dot is still missing after the new build is running, send one `emu geo fix` and screenshot again.
- **Clear the system accuracy dialog first.** After location permission is granted, Google Play services can cover the screen with "Location Accuracy" (No thanks / Turn on). While it is open the app gets no fix, so the map shows no dot, no readout and no error. Decline with "No thanks" and never tap "Turn on" without the user's say-so, because it is a data-collection consent. Confirm the Simulated tag and the readout text on the screenshot, not only the dot. Map pins are not reachable by text tap, so drive them by coordinates.
