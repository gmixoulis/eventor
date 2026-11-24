// Pure form validators. Each returns an error message, or null when valid.

export const INTRO_MAX = 280;

export function requiredError(value: string): string | null {
  return value.trim() ? null : 'This field is required';
}

export function introError(value: string): string | null {
  if (!value.trim()) return 'This field is required';
  if (value.length > INTRO_MAX) return `Introduction is too long (${value.length}/${INTRO_MAX})`;
  return null;
}

export function httpsError(value: string): string | null {
  if (!value.trim()) return null; // optional field
  return value.startsWith('https://') ? null : 'Must start with https://';
}

export function passwordError(value: string): string | null {
  if (!value) return 'This field is required';
  if (value.length < 8) return 'At least 8 characters';
  return null;
}

export function confirmPasswordError(password: string, confirm: string): string | null {
  if (!confirm) return 'This field is required';
  return confirm === password ? null : 'Passwords do not match';
}
