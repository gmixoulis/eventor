import { describe, expect, it } from '@jest/globals';

import { matchesPrefix } from '@/lib/paths';

describe('matchesPrefix', () => {
  it('matches the prefix and nested routes only', () => {
    expect(matchesPrefix('/ask', ['/ask'])).toBe(true);
    expect(matchesPrefix('/ask/x', ['/ask'])).toBe(true);
    expect(matchesPrefix('/asked', ['/ask'])).toBe(false);
    expect(matchesPrefix('/map', ['/ask', '/map'])).toBe(true);
    expect(matchesPrefix('/', [])).toBe(false);
  });
});
