import { describe, expect, it } from '@jest/globals';

import type { Application } from '@/backend/types';
import {
  apply,
  applicationError,
  canManage,
  decide,
  fitLabel,
  sortForReview,
  withdraw,
  type ApplicationInput,
} from '@/lib/applications';

const NOW = '2026-05-27T10:00:00.000Z';
const LATER = '2026-05-27T11:00:00.000Z';
const ADMINS = { 'se-pitch-clinic': 'acct-investor' };

const member: ApplicationInput = {
  sideEventId: 'se-pitch-clinic',
  accountId: 'acct-founder',
  name: 'Alex Demo',
  email: 'alex.demo@example.com',
  note: '',
};
const visitor: ApplicationInput = {
  sideEventId: 'se-pitch-clinic',
  accountId: null,
  name: ' Sam Visitor ',
  email: ' Sam@Example.com ',
  note: 'Building a seed deck',
  selections: ['early-stage'],
};

function filed(input: ApplicationInput, id = 'a1'): Application[] {
  const result = apply([], input, id, NOW);
  if (!result.ok) throw new Error(result.error);
  return result.apps;
}

describe('applicationError', () => {
  it('checks name length, email format and note length', () => {
    expect(applicationError({ name: 'Al', email: 'a@b.co', note: '' })).toBeNull();
    expect(applicationError({ name: ' A ', email: 'a@b.co', note: '' })).toMatch(/Name/);
    expect(applicationError({ name: 'x'.repeat(81), email: 'a@b.co', note: '' })).toMatch(/Name/);
    expect(applicationError({ name: 'Alex', email: 'not-an-email', note: '' })).toBe('Enter a valid email');
    expect(applicationError({ name: 'Alex', email: 'a@b.co', note: 'x'.repeat(281) })).toMatch(/too long/);
    expect(applicationError({ name: 'Alex', email: 'a@b.co', note: 'x'.repeat(280) })).toBeNull();
  });
});

describe('apply', () => {
  it('files a pending request, trimming the name and lower-casing the email', () => {
    const [app] = filed(visitor);
    expect(app).toMatchObject({ status: 'pending', name: 'Sam Visitor', email: 'sam@example.com', selections: ['early-stage'] });
    expect(filed(member)[0].selections).toBeUndefined();
  });

  it('returns the open request instead of filing a second one, per account', () => {
    const apps = filed(member);
    const again = apply(apps, member, 'a2', LATER);
    expect(again).toMatchObject({ ok: true, application: { id: 'a1' } });
    expect(again.ok && again.apps).toBe(apps);
  });

  it('matches visitors by email whatever its case or spacing', () => {
    const apps = filed(visitor);
    const again = apply(apps, { ...visitor, email: 'sam@example.COM' }, 'a2', LATER);
    expect(again.ok && again.application.id).toBe('a1');
    // A signed-in account with the same email is a different requester.
    const account = apply(apps, { ...member, email: 'sam@example.com' }, 'a3', LATER);
    expect(account.ok && account.apps).toHaveLength(2);
  });

  it('files again after the earlier request was closed', () => {
    const closed = withdraw(filed(member), 'a1', { accountId: 'acct-founder' }, LATER);
    if (!closed.ok) throw new Error(closed.error);
    const again = apply(closed.apps, member, 'a2', LATER);
    expect(again.ok && again.apps.map((a) => a.status)).toEqual(['withdrawn', 'pending']);
  });

  it('refuses an invalid form', () => {
    expect(apply([], { ...visitor, email: 'nope' }, 'a1', NOW)).toEqual({ ok: false, error: 'Enter a valid email' });
  });
});

describe('decide', () => {
  it('lets the event sub-admin or the admin decide, nobody else', () => {
    expect(canManage('se-pitch-clinic', 'acct-investor', ADMINS, false)).toBe(true);
    expect(canManage('se-pitch-clinic', 'acct-media', ADMINS, false)).toBe(false);
    expect(canManage('se-pitch-clinic', 'acct-founder', ADMINS, true)).toBe(true);
    expect(decide(filed(member), 'a1', 'approve', 'acct-media', ADMINS, false, true, LATER)).toEqual({ ok: false, error: 'Not allowed' });
  });

  it('approves a pending request with a free seat and records who decided', () => {
    const result = decide(filed(member), 'a1', 'approve', 'acct-investor', ADMINS, false, true, LATER);
    expect(result.ok && result.application).toMatchObject({ status: 'approved', decidedAt: LATER, decidedBy: 'acct-investor' });
  });

  it('refuses to approve without a free seat, but can still reject', () => {
    expect(decide(filed(member), 'a1', 'approve', 'acct-investor', ADMINS, false, false, LATER)).toEqual({ ok: false, error: 'No seats left' });
    const rejected = decide(filed(member), 'a1', 'reject', 'acct-investor', ADMINS, false, false, LATER);
    expect(rejected.ok && rejected.application.status).toBe('rejected');
  });

  it('decides only pending requests', () => {
    const once = decide(filed(member), 'a1', 'reject', 'acct-investor', ADMINS, false, true, LATER);
    if (!once.ok) throw new Error(once.error);
    expect(decide(once.apps, 'a1', 'approve', 'acct-investor', ADMINS, false, true, LATER)).toEqual({ ok: false, error: 'Already decided' });
    expect(decide(once.apps, 'nope', 'approve', 'acct-investor', ADMINS, false, true, LATER)).toEqual({ ok: false, error: 'Request not found' });
  });
});

describe('withdraw', () => {
  it('is for the requester only and frees the seat of an approved request', () => {
    const approved = decide(filed(member), 'a1', 'approve', 'acct-investor', ADMINS, false, true, LATER);
    if (!approved.ok) throw new Error(approved.error);
    expect(withdraw(approved.apps, 'a1', { accountId: 'acct-media' }, LATER).ok).toBe(false);
    const result = withdraw(approved.apps, 'a1', { accountId: 'acct-founder' }, LATER);
    expect(result).toMatchObject({ ok: true, freedSeat: true, application: { status: 'withdrawn' } });
  });

  it('lets a visitor withdraw by email, freeing no seat while pending', () => {
    const apps = filed(visitor);
    expect(withdraw(apps, 'a1', { email: 'other@example.com' }, LATER).ok).toBe(false);
    expect(withdraw(apps, 'a1', { email: 'SAM@example.com' }, LATER)).toMatchObject({ ok: true, freedSeat: false });
  });

  it('refuses a closed request', () => {
    const once = withdraw(filed(member), 'a1', { accountId: 'acct-founder' }, LATER);
    if (!once.ok) throw new Error(once.error);
    expect(withdraw(once.apps, 'a1', { accountId: 'acct-founder' }, LATER)).toEqual({ ok: false, error: 'Already closed' });
  });
});

describe('fitLabel', () => {
  // Scores of the seeded accounts with the default lexical embedder (see applications-api.test.ts).
  it('labels the seeded scores', () => {
    expect(fitLabel(0.932)).toBe('Strong fit'); // investor at Investor Roundtables
    expect(fitLabel(0.7)).toBe('Strong fit');
    expect(fitLabel(0.668)).toBe('Good fit'); // investor at Pitch Deck Clinic
    expect(fitLabel(0.375)).toBe('Good fit'); // founder at Pitch Deck Clinic, shares Early Stage
    expect(fitLabel(0.35)).toBe('Good fit');
    expect(fitLabel(0.244)).toBe('Weak fit'); // founder at Investor Roundtables
    expect(fitLabel(0)).toBe('Weak fit'); // media at Pitch Deck Clinic
  });
});

describe('sortForReview', () => {
  it('puts pending first, then the best fit, then the earliest', () => {
    const row = (id: string, status: Application['status'], score: number, createdAt = NOW) => ({
      application: { ...filed(member, id)[0], status, createdAt },
      score,
    });
    const sorted = sortForReview([
      row('decided', 'approved', 0.9),
      row('weak', 'pending', 0.1),
      row('late', 'pending', 0.5, LATER),
      row('early', 'pending', 0.5),
    ]);
    expect(sorted.map((r) => r.application.id)).toEqual(['early', 'late', 'weak', 'decided']);
  });
});
