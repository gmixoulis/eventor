import { describe, expect, it } from '@jest/globals';

import { withoutDisabledFeatures, type AgendaItem } from '@/lib/agenda-item';

const item = (kind: AgendaItem['kind'], id: string): AgendaItem => ({
  key: `${kind}:${id}`,
  kind,
  id,
  title: id,
  day: '2026-01-01',
  startTime: '09:00',
  endTime: '09:30',
  place: 'Main',
});

const on = { meetings: true, schedule: true, sideEvents: true };
const items = [item('session', 's1'), item('meeting', 'm1'), item('side-event', 'e1')];
const ids = (flags: typeof on) => withoutDisabledFeatures(items, flags).map((i) => i.id);

describe('withoutDisabledFeatures', () => {
  it('keeps everything when all features are on', () => {
    expect(withoutDisabledFeatures(items, on)).toEqual(items);
  });

  it('drops each kind only when its own feature is off', () => {
    expect(ids({ ...on, meetings: false })).toEqual(['s1', 'e1']);
    expect(ids({ ...on, schedule: false })).toEqual(['m1', 'e1']);
    expect(ids({ ...on, sideEvents: false })).toEqual(['s1', 'm1']);
  });

  it('drops all when all are off, and leaves the input untouched', () => {
    expect(ids({ meetings: false, schedule: false, sideEvents: false })).toEqual([]);
    expect(items).toHaveLength(3);
    expect(ids(on)).toEqual(['s1', 'm1', 'e1']);
  });
});
