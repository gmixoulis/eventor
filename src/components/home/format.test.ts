import { describe, expect, it } from '@jest/globals';

import { activityBody } from '@/components/home/format';

describe('activity body', () => {
  const item = { body: '', meetingStart: '2026-05-28T13:20', place: 'Table 3' };

  it('formats a meeting item with the 24-hour setting at render time', () => {
    expect(activityBody(item, true, 'Eventor Festival')).toBe('Eventor Festival 28.5.2026: Table 3 at 13:20');
    expect(activityBody(item, false, 'Eventor Festival')).toBe('Eventor Festival 28.5.2026: Table 3 at 1:20 PM');
    expect(activityBody(item, true, 'Expo 27')).toBe('Expo 27 28.5.2026: Table 3 at 13:20');
  });

  it('shows an older item that only stored a body as it was', () => {
    expect(activityBody({ body: 'Old text at 1:20 PM' }, true, 'Expo 27')).toBe('Old text at 1:20 PM');
  });
});
