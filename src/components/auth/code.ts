/** The demo build's sign-in code. Nothing is ever sent; the code step says so on screen. */
export const DEMO_CODE = '1234';
export const CODE_LENGTH = 4;

/** True only for the exact demo code: four digits, no spaces or other characters. */
export function isDemoCode(value: string): boolean {
  return value === DEMO_CODE;
}

/** Keeps digits only and caps the length, for a number-pad field that should never hold anything else. */
export function codeDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH);
}
