/** Pure card checks for the demo checkout. Nothing here stores or logs the full number or CVC. */

export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Other';

/** The demo decline card: passes every format check but is refused by the mock processor. */
export const DECLINE_CARD = '4000000000000002';

/** Digits only, so "4000 0000 0000 0002" and "4000000000000002" are the same. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Luhn check over a digit string; the 13-19 digit length range is enforced here too. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Brand from the leading digits: Visa, Mastercard, Amex, or Other for anything else. */
export function cardBrand(digits: string): CardBrand {
  if (digits.startsWith('4')) return 'Visa';
  const first4 = Number(digits.slice(0, 4));
  if ((digits.startsWith('5') && digits[1] >= '1' && digits[1] <= '5') || (first4 >= 2221 && first4 <= 2720)) {
    return 'Mastercard';
  }
  if (digits.startsWith('34') || digits.startsWith('37')) return 'Amex';
  return 'Other';
}

/** "MM/YY" or "MMYY" whose month has not ended at `now`. */
export function validExpiry(value: string, now: Date): boolean {
  const match = /^(\d{2})(?:\s*\/\s*)?(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  // Valid through the last day of the expiry month.
  return new Date(year, month, 1) > now;
}

/** CVC is 3 or 4 digits. */
export function validCvc(value: string): boolean {
  return /^\d{3,4}$/.test(value.trim());
}

/** The one card every checkout declines, checked after the format checks pass. */
export function isDeclined(digits: string): boolean {
  return digits === DECLINE_CARD;
}
