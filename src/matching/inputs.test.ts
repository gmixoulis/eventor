import { describe, expect, it } from '@jest/globals';

import type { Meeting, Profile } from '@/backend/types';
import { buildMe, freeSlotRatio, isStaleRequest, profileText, toMatchProfile } from '@/matching/inputs';

const NOW = new Date('2026-05-27T12:00:00Z');

describe('profileText', () => {
  const base = { id: 'x', intro: 'Builds things', title: 'CEO', company: 'Acme', industry: '' };

  it('joins non-blank parts and resolved interest names, skipping unknown ids', () => {
    const text = profileText({
      ...base,
      selections: [
        { interestId: 'group-industry-fintech', goalId: 'network' },
        { interestId: 'does-not-exist', goalId: 'network' },
      ],
    });
    expect(text).toMatch(/^Builds things CEO Acme \S/);
    expect(text).not.toContain('does-not-exist');
  });

  it('drops blank and whitespace-only parts', () => {
    expect(profileText({ ...base, intro: '   ', selections: [] })).toBe('CEO Acme');
  });
});

describe('toMatchProfile', () => {
  it('fills neutral signal defaults', () => {
    const result = toMatchProfile({
      id: 'p',
      intro: '',
      title: 'T',
      company: 'C',
      industry: 'I',
      selections: [],
      lastActiveAt: 'z',
    });
    expect(result).toMatchObject({
      id: 'p',
      acceptedMeetings: 0,
      staleRequests: 0,
      freeSlotRatio: 1,
      lastActiveAt: 'z',
    });
  });
});

describe('freeSlotRatio', () => {
  const slots = ['2026-05-27T09:00', '2026-05-27T10:00', '2026-05-27T11:00', '2026-05-27T12:00'];

  it('is 1 with no availability', () => {
    expect(freeSlotRatio([], [{ start: '2026-05-27T09:30', status: 'accepted' }])).toBe(1);
  });

  it('counts a non-declined meeting as occupying its hour', () => {
    const meetings = [
      { start: '2026-05-27T09:30:00', status: 'accepted' },
      { start: '2026-05-27T10:00:00', status: 'pending' },
    ];
    expect(freeSlotRatio(slots, meetings)).toBe(0.5);
  });

  it('ignores declined meetings', () => {
    expect(freeSlotRatio(slots, [{ start: '2026-05-27T09:00:00', status: 'declined' }])).toBe(1);
  });
});

describe('isStaleRequest', () => {
  it('is stale only after more than five hours', () => {
    expect(isStaleRequest('2026-05-27T06:59:00Z', NOW)).toBe(true);
    expect(isStaleRequest('2026-05-27T07:00:00Z', NOW)).toBe(false);
  });

  it('is not stale for an unparseable date', () => {
    expect(isStaleRequest('nope', NOW)).toBe(false);
  });
});

describe('buildMe', () => {
  it('derives accepted count, stale inbound pending count and free ratio', () => {
    const old = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const fresh = new Date().toISOString();
    const meeting = (over: Partial<Meeting>) =>
      ({
        start: '2026-05-27T09:00:00',
        status: 'pending',
        direction: 'inbound',
        createdAt: fresh,
        ...over,
      }) as Meeting;
    const profile = {
      id: 'me',
      selections: [],
      intro: '',
      title: 'T',
      company: 'C',
      industry: 'I',
      role: 'Startup',
      availability: ['2026-05-27T09:00', '2026-05-27T10:00'],
    } as unknown as Profile;
    const me = buildMe(profile, [
      meeting({ status: 'accepted' }),
      meeting({ createdAt: old }),
      meeting({ createdAt: old, direction: 'outbound' }),
      meeting({ createdAt: fresh }),
    ]);
    expect(me.acceptedMeetings).toBe(1);
    expect(me.staleRequests).toBe(1);
    expect(me.freeSlotRatio).toBe(0.5);
  });
});
