import { describe, expect, it } from '@jest/globals';

import {
  confirmPasswordError,
  httpsError,
  introError,
  passwordError,
  requiredError,
} from '@/components/account/validators';

describe('requiredError', () => {
  it('flags empty and blank values', () => {
    expect(requiredError('')).toBe('This field is required');
    expect(requiredError('   ')).toBe('This field is required');
  });
  it('accepts any non-blank value', () => {
    expect(requiredError('Alex')).toBeNull();
  });
});

describe('introError', () => {
  it('requires a value', () => {
    expect(introError('')).toBe('This field is required');
  });
  it('accepts up to 280 characters', () => {
    expect(introError('x'.repeat(280))).toBeNull();
  });
  it('rejects over 280 characters', () => {
    expect(introError('x'.repeat(281))).toContain('too long');
  });
});

describe('httpsError', () => {
  it('allows empty (optional)', () => {
    expect(httpsError('')).toBeNull();
    expect(httpsError('   ')).toBeNull();
  });
  it('requires the https scheme when filled', () => {
    expect(httpsError('https://example.com')).toBeNull();
    expect(httpsError('http://example.com')).toBe('Must start with https://');
    expect(httpsError('example.com')).toBe('Must start with https://');
  });
});

describe('passwordError', () => {
  it('requires a value', () => {
    expect(passwordError('')).toBe('This field is required');
  });
  it('rejects short passwords', () => {
    expect(passwordError('short1')).toBe('At least 8 characters');
  });
  it('accepts 8 or more characters', () => {
    expect(passwordError('12345678')).toBeNull();
  });
});

describe('confirmPasswordError', () => {
  it('requires a value', () => {
    expect(confirmPasswordError('12345678', '')).toBe('This field is required');
  });
  it('rejects mismatches', () => {
    expect(confirmPasswordError('12345678', '12345679')).toBe('Passwords do not match');
  });
  it('accepts a match', () => {
    expect(confirmPasswordError('12345678', '12345678')).toBeNull();
  });
});
