import { describe, expect, it } from '@jest/globals';

import { nextId } from '@/store/ids';

describe('nextId', () => {
  it('prefixes the id and never repeats within the same millisecond', () => {
    const ids = Array.from({ length: 50 }, () => nextId('act'));
    expect(ids.every((id) => /^act-\d+-\d+$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(50);
  });

  it('keeps prefixes apart', () => {
    expect(nextId('msg').startsWith('msg-')).toBe(true);
  });
});
