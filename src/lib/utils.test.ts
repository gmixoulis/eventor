import { describe, expect, it } from '@jest/globals';

import { addIn, hashString, toggleIn } from '@/lib/utils';

describe('toggleIn', () => {
  it('appends a missing id and removes a present one', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('works on an empty list and never mutates the input', () => {
    const list = ['a'];
    expect(toggleIn([], 'a')).toEqual(['a']);
    toggleIn(list, 'a');
    toggleIn(list, 'b');
    expect(list).toEqual(['a']);
  });

  it('removes every duplicate of the id', () => {
    expect(toggleIn(['a', 'b', 'a'], 'a')).toEqual(['b']);
  });
});

describe('addIn', () => {
  it('appends a missing id', () => {
    expect(addIn(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('returns the same list reference when the id is already there', () => {
    const list = ['a', 'b'];
    expect(addIn(list, 'a')).toBe(list);
  });
});

describe('hashString', () => {
  it('matches published FNV-1a 32-bit vectors', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('foobar')).toBe(0xbf9cf968);
  });

  it('is deterministic, unsigned and differs between inputs', () => {
    expect(hashString('session:1')).toBe(hashString('session:1'));
    expect(hashString('session:1')).not.toBe(hashString('session:2'));
    for (const s of ['x', 'zzzzzzzzzzzz', 'Ελληνικά']) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
