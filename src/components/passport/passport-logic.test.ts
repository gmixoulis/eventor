import { describe, expect, it } from '@jest/globals';

import {
  collectLink,
  completedGroups,
  howToCollect,
  newlyDone,
  passportLayout,
  recentStamps,
  shareMessage,
} from '@/components/passport/passport-logic';
import { listChallenges, listStampTargets } from '@/data';

const challenges = listChallenges();
const progressWith = (doneIds: string[]) =>
  challenges.map((c) => ({ id: c.id, done: doneIds.includes(c.id), progress: 0, goal: c.rule.count, bonus: c.bonus }));

describe('completedGroups', () => {
  it('is empty when nothing is done', () => {
    expect(completedGroups(challenges, progressWith([]))).toEqual([]);
  });

  it('needs every challenge of a kind', () => {
    expect(completedGroups(challenges, progressWith(['ch-places-2']))).toEqual([]);
    expect(completedGroups(challenges, progressWith(['ch-places-2', 'ch-stages-3']))).toEqual(['place']);
  });

  it('ignores the any-kind challenge and names groups by kind', () => {
    const all = challenges.map((c) => c.id);
    expect(completedGroups(challenges, progressWith(['ch-any-10']))).toEqual([]);
    expect(completedGroups(challenges, progressWith(all))).toEqual(['place', 'sponsor', 'side-event']);
  });

  it('matches the group names the constellation layout uses', () => {
    const layout = passportLayout(listStampTargets(), 'seed', 320);
    const groups = new Set(layout.links.map((l) => l.group));
    const all = completedGroups(challenges, progressWith(challenges.map((c) => c.id)));
    expect(all.every((g) => groups.has(g))).toBe(true);
    expect(layout.height).toBe(224);
  });
});

describe('newlyDone', () => {
  it('lists only challenges that just turned done', () => {
    expect(newlyDone(['ch-places-2'], progressWith(['ch-places-2', 'ch-side-2']))).toEqual(['ch-side-2']);
    expect(newlyDone(['ch-places-2'], progressWith(['ch-places-2']))).toEqual([]);
  });
});

describe('how to collect', () => {
  it('has text and a destination per kind', () => {
    expect(howToCollect('place')).toBe('Visit this place on the map and mark it visited or scan its checkpoint');
    expect(howToCollect('sponsor')).toBe("Check in at this sponsor's booth");
    expect(howToCollect('side-event')).toBe('Check in at this side event while it is on');
    const base = { id: 'x', title: 'X', points: 10 };
    expect(collectLink({ ...base, kind: 'place', refId: 'p1' }).path).toBe('/map');
    expect(collectLink({ ...base, kind: 'sponsor', refId: 'sp1' }).path).toBe('/sponsor/sp1');
    expect(collectLink({ ...base, kind: 'side-event', refId: 'se1' }).path).toBe('/side-event/se1');
  });
});

describe('recentStamps', () => {
  it('keeps the newest five, newest first', () => {
    const stamps = Array.from({ length: 7 }, (_, i) => ({ targetId: `t${i}`, at: `2026-05-2${i}T10:00:00.000Z` }));
    expect(recentStamps(stamps).map((s) => s.targetId)).toEqual(['t6', 't5', 't4', 't3', 't2']);
  });
});

describe('shareMessage', () => {
  it('reads as a sentence', () => {
    expect(shareMessage(4, 95)).toBe('I collected 4 stamps and 95 points at Eventor Summit.');
    expect(shareMessage(1, 10)).toBe('I collected 1 stamp and 10 points at Eventor Summit.');
    expect(shareMessage(1, 10, 'Expo 27')).toBe('I collected 1 stamp and 10 points at Expo 27.');
  });
});
