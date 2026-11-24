import { describe, expect, it } from '@jest/globals';

import {
  cardBrand,
  DECLINE_CARD,
  digitsOnly,
  isDeclined,
  luhnValid,
  validCvc,
  validExpiry,
} from '@/lib/card';

describe('digitsOnly', () => {
  it('keeps only digits, removing spaces and dashes', () => {
    expect(digitsOnly('4000 0000 0000 0002')).toBe('4000000000000002');
    expect(digitsOnly('4242-4242-4242-4242')).toBe('4242424242424242');
    expect(digitsOnly(' 4a2b4c2 ')).toBe('4242');
  });
});

describe('luhnValid', () => {
  it('accepts valid numbers and rejects a wrong check digit', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid(DECLINE_CARD)).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
  });

  it('rejects lengths outside 13-19 digits', () => {
    expect(luhnValid('4242')).toBe(false);
    expect(luhnValid('42424242424242424242')).toBe(false);
  });
});

describe('cardBrand', () => {
  it('reads the brand from the leading digits', () => {
    expect(cardBrand('4111111111111111')).toBe('Visa');
    expect(cardBrand('5555555555554444')).toBe('Mastercard');
    expect(cardBrand('2221000000000009')).toBe('Mastercard');
    expect(cardBrand('378282246310005')).toBe('Amex');
    expect(cardBrand('340000000000009')).toBe('Amex');
    expect(cardBrand('6011111111111117')).toBe('Other');
  });
});

describe('validExpiry', () => {
  const now = new Date('2026-06-15T00:00:00Z');

  it('accepts MMYY from a number pad with the same month checks as MM/YY', () => {
    expect(validExpiry('1228', now)).toBe(true);
    expect(validExpiry('0626', now)).toBe(true);
    expect(validExpiry('0526', now)).toBe(false);
    expect(validExpiry('1328', now)).toBe(false);
    expect(validExpiry('122', now)).toBe(false);
  });

  it('accepts a future or current month and rejects a past one', () => {
    expect(validExpiry('06/26', now)).toBe(true); // the expiry month has not ended yet
    expect(validExpiry('07/26', now)).toBe(true);
    expect(validExpiry('05/26', now)).toBe(false);
  });

  it('accepts spacing around the slash and rejects malformed values', () => {
    expect(validExpiry(' 12 / 27 ', now)).toBe(true);
    expect(validExpiry('13/27', now)).toBe(false);
    expect(validExpiry('12-27', now)).toBe(false);
    expect(validExpiry('12/2', now)).toBe(false);
  });
});

describe('validCvc', () => {
  it('accepts 3 or 4 digits only', () => {
    expect(validCvc('123')).toBe(true);
    expect(validCvc('1234')).toBe(true);
    expect(validCvc('12')).toBe(false);
    expect(validCvc('12345')).toBe(false);
  });
});

describe('isDeclined', () => {
  it('flags only the demo decline card', () => {
    expect(isDeclined('4000000000000002')).toBe(true);
    expect(isDeclined('4242424242424242')).toBe(false);
  });
});
