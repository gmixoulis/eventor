import { it, expect } from '@jest/globals';

import summaries from '@/assistant/summaries.json';
import { entityKey, summaryTargets } from '@/assistant/catalog';

it('rejects stale summary keys and requires complete coverage once populated', () => {
  const expected = summaryTargets.map(entityKey);
  const entries: Record<string, string> = summaries;
  const keys = Object.keys(entries);
  keys.forEach((key) => expect(expected).toContain(key));
  if (keys.length) {
    expect(keys.sort()).toEqual(expected.sort());
    Object.values(entries).forEach((text) => expect(text.trim().length).toBeGreaterThan(0));
  }
});

it('writes stored time ranges with to instead of a dash', () => {
  const text = Object.values(summaries).join('\n');
  expect(text).toContain('09:00 to 09:30');
  expect(text).not.toMatch(/\d{2}:\d{2}\s*[-\u2013\u2014]\s*\d{2}:\d{2}/);
});
