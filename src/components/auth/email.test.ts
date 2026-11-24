import { describe, expect, it } from '@jest/globals';

import { emailError } from '@/components/auth/email';

describe('emailError', () => {
  it('accepts a plain address, ignoring surrounding spaces', () => {
    expect(emailError('name@company.com')).toBeNull();
    expect(emailError('  name@company.com ')).toBeNull();
  });

  it('rejects an empty or blank value', () => {
    expect(emailError('')).not.toBeNull();
    expect(emailError('   ')).not.toBeNull();
  });

  it('rejects spaces inside the address', () => {
    expect(emailError('name @company.com')).not.toBeNull();
    expect(emailError('name@com pany.com')).not.toBeNull();
  });

  it('rejects a missing @ or a missing dot', () => {
    expect(emailError('namecompany.com')).not.toBeNull();
    expect(emailError('name@companycom')).not.toBeNull();
    expect(emailError('name@@company.com')).not.toBeNull();
  });
});
