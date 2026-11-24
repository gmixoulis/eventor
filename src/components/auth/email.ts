// Format check only: the demo never stores, logs or sends the address.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An error message for the sign-in email field, or null when it looks like an address. */
export function emailError(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address';
  return EMAIL.test(email) ? null : 'Enter an address like name@company.com';
}
