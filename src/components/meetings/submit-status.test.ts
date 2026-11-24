import { describe, expect, it } from '@jest/globals';

import { submitStatus } from '@/components/meetings/submit-status';

describe('slot picker submit status', () => {
  it('confirms only when the write happened', () => {
    expect(submitStatus(true)).toBe('sent');
    expect(submitStatus(false)).toBe('error');
  });
});
