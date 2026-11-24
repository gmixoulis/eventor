/**
 * Sign-in-required handler registry. The store's mutators call `requireSignIn`
 * for signed-in-only actions on guest-reachable screens; AuthProvider registers
 * the real handler (which opens /sign-in with a `next` route). Kept dependency-free
 * so the store can import it without a cycle.
 */
let handler: (() => void) | null = null;

export function setSignInRequiredHandler(fn: (() => void) | null): void {
  handler = fn;
}

export function requireSignIn(): void {
  handler?.();
}
