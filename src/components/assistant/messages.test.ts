import { describe, expect, it } from '@jest/globals';

import { canRetry, failureMessage, STARTERS } from '@/components/assistant/messages';

describe('failureMessage', () => {
  it('words each failure', () => {
    expect(failureMessage('not-configured')).toBe('The assistant is not connected in this build yet.');
    expect(failureMessage('rate-limited', 12)).toBe('Too many questions. Try again in 12 seconds.');
    expect(failureMessage('rate-limited')).toBe('Too many questions. Try again in a moment.');
    expect(failureMessage('offline')).toMatch(/connection/);
    expect(failureMessage('unavailable')).toMatch(/unavailable/);
  });

  it('never uses an em dash', () => {
    for (const r of ['not-configured', 'offline', 'rate-limited', 'unavailable', 'invalid'] as const) {
      expect(failureMessage(r, 5)).not.toContain('—');
    }
  });

  it('offers retry only for offline and unavailable', () => {
    expect((['offline', 'unavailable', 'rate-limited', 'not-configured', 'invalid'] as const).map((r) => canRetry(r)))
      .toEqual([true, true, false, false, false]);
  });
});

describe('STARTERS', () => {
  it('cover six supported starting questions, in order', () => {
    expect([...STARTERS]).toEqual([
      "What's on now?", "What's next?", 'Where is the venue?',
      'Which startups are pitching?', 'Summarize today', 'Who is speaking today?',
    ]);
  });
});
