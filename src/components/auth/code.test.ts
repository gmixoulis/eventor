import { describe, expect, it } from '@jest/globals';

import { codeDigits, isDemoCode } from '@/components/auth/code';

describe('isDemoCode', () => {
  it('accepts 1234', () => {
    expect(isDemoCode('1234')).toBe(true);
  });

  it('rejects other digits and short input', () => {
    expect(isDemoCode('1235')).toBe(false);
    expect(isDemoCode('0000')).toBe(false);
    expect(isDemoCode('123')).toBe(false);
    expect(isDemoCode('')).toBe(false);
    expect(isDemoCode('12345')).toBe(false);
  });

  it('rejects letters and spaces', () => {
    expect(isDemoCode('12a4')).toBe(false);
    expect(isDemoCode('abcd')).toBe(false);
    expect(isDemoCode(' 1234')).toBe(false);
    expect(isDemoCode('12 34')).toBe(false);
  });
});

describe('codeDigits', () => {
  it('drops non-digits and caps at four', () => {
    expect(codeDigits('1a2 3-4')).toBe('1234');
    expect(codeDigits('123456')).toBe('1234');
    expect(codeDigits('ab')).toBe('');
  });
});
