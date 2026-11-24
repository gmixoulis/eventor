---
name: expo-router-bundle-hygiene
description: Use when Metro bundle breaks on a test in src/app.
category: expo-build
---

# Keep test files out of the Expo Router graph

Every file under `src/app/` is a route candidate, so Expo Router bundles it. A test file there pulls its imports into the app bundle, and Metro can fail on test-only code (for example a dynamic `require.resolve('test-renderer')` in a test helper) while unit tests still pass.

- Put tests and test helpers outside `src/app/`, next to the code they cover or under a test folder, and import with `@/` aliases.
- After any change under `src/app/`, run `find src/app -name '*.test.*'` and expect no output.
- Unit tests do not catch this. Confirm with a Metro bundle request or a launch on the emulator, and read the "Android Bundled N modules" line.
- Helpers that use dynamic `require` or `require.resolve` must stay out of any module the app imports.

Evidence: a legal screen test under `src/app/account/` broke the Metro bundle; the bundle succeeded after the test moved beside `checkout.test.tsx`.
