---
name: offline-demo-bundle
description: Use when making an offline APK with bundled backend data.
category: release
---

# Offline demo APK: scrub captured data, then prove zero backend requests

- Captured fixtures come from a live or dev backend and carry test accounts. Before bundling, search the data for every test identity you created (probe names, test names, test emails, `mapcheck`, `roleprobe`) and remove them. Then recount the lists the app shows, such as speakers, and match the count to the real content. Last time a "Role Probe speaker" from a sign-up test reached the bundle and was caught only after the build.
- Replace any remaining test name or email with a neutral demo identity (for example "Demo Attendee"). Never print real emails in the report.
- Keep the bundle behind a build flag (for example `EXPO_PUBLIC_OFFLINE_DEMO=1`) so the online build is unchanged.
- Verify on the emulator after a fresh install (`adb uninstall`, then `install`): record the backend log line count before launch, open the screens, and count requests after. The release is valid only when the count is 0. Photos and content must come from the bundle; only external map tiles may use the network.
- Rerun the JS bundle task with the APK build (see `expo-local-android-build`) so the flag is really compiled in. Metro's transform cache can keep modules compiled under the other flag even with `--rerun`. Before an online build that follows an offline one, move `$TMPDIR/metro-cache` aside, then confirm the APK makes backend requests. An offline-mode APK built from a stale cache is a failed build, not a passed one. Symptom of a leaked offline bundle in an online build: the app opens already signed in as the demo user instead of the sign-up or sign-in screen. The string "Demo Attendee" alone proves nothing, because the fixture always bundles it; judge by the first screen and the backend log, then move the Metro cache aside and rebuild.
- Publish the offline APK under its own tag, leave the online release in place, and state in the release notes what is empty offline (messages, networking, notifications, polls, rewards, tickets).
- Refresh the data with the capture script, then rerun the scrub before each release.
