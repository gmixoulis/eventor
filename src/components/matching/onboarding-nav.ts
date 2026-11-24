import { router } from 'expo-router';

/**
 * Where Finish goes, from every entry point: /people, with no onboarding step left behind it.
 * Uses the documented stack actions (docs.expo.dev/router/advanced/stack): `dismissAll` returns to
 * the first screen of the closest stack, then `/people` is pushed on top. `dismissTo('/people')`
 * is not used because, when /people is not in the history, it replaces only the current screen
 * and leaves steps 1 and 2 under it. When nothing can be dismissed (the flow was the first
 * screen), `replace` swaps the step out so back cannot return into it.
 */
export function leaveOnboarding(): void {
  if (router.canDismiss()) {
    router.dismissAll();
    router.push('/people');
  } else {
    router.replace('/people');
  }
}
