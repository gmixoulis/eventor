import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
    getAllKeys: jest.fn(async () => Array.from(mockStorage.keys())),
    multiRemove: jest.fn(async (keys: string[]) => keys.forEach((k) => mockStorage.delete(k))),
  },
}));

declare const require: (id: string) => unknown;

function loadApi(): typeof import('@/backend/api') {
  jest.resetModules();
  return require('@/backend/api') as typeof import('@/backend/api');
}

beforeEach(() => {
  mockStorage.clear();
});

// Seeded sub-admin of both; Pitch Deck Clinic has 40 free seats, Investor Roundtables is full (35 of 35).
const CLINIC = 'se-pitch-clinic';
const ROUNDTABLES = 'se-investor-roundtables';
// Long before the event, so no simulated walk-ins count yet.
const EARLY = new Date('2026-01-01T00:00:00Z');

function request(accountId: string | null, sideEventId = CLINIC) {
  return { sideEventId, accountId, name: 'Applicant Name', email: `${accountId ?? 'visitor'}@example.com`, note: '' };
}

describe('applications api', () => {
  it('lists requests only for the event sub-admin or the admin', async () => {
    const { api } = loadApi();
    await api.applications.apply(request('acct-founder'));
    await expect(api.applications.listForEvent('acct-media', CLINIC)).rejects.toThrow('Not allowed');
    expect(await api.applications.listForEvent('acct-investor', CLINIC)).toHaveLength(1);
    expect(await api.applications.listForEvent('acct-founder', CLINIC)).toHaveLength(1); // the admin
  });

  it('lets only the sub-admin or the admin decide', async () => {
    const { api } = loadApi();
    const app = await api.applications.apply(request('acct-media'));
    await expect(api.applications.decide('acct-corporate', app.id, 'approve', EARLY)).rejects.toThrow('Not allowed');
    expect((await api.applications.decide('acct-founder', app.id, 'reject', EARLY)).status).toBe('rejected');
  });

  it('approving takes a seat, adds the event to the agenda with a reminder and tells the applicant', async () => {
    const { api } = loadApi();
    const app = await api.applications.apply(request('acct-media'));
    expect(await api.applications.seatsLeft(CLINIC, EARLY)).toBe(40);
    await api.applications.decide('acct-investor', app.id, 'approve', EARLY);
    expect(await api.applications.seatsLeft(CLINIC, EARLY)).toBe(39);
    expect((await api.reservations.counts())[`side-event:${CLINIC}`]).toBe(1);
    const state = await api.me.get('acct-media');
    expect(state?.mySideEvents).toContain(CLINIC);
    expect(state?.reminders).toContain(`side-event:${CLINIC}`);
    expect(state?.activity[0].title).toBe('Your request was approved: you are in for Pitch Deck Clinic');
  });

  it('refuses to approve on a full event with "No seats left"', async () => {
    const { api } = loadApi();
    const app = await api.applications.apply(request('acct-media', ROUNDTABLES));
    await expect(api.applications.decide('acct-investor', app.id, 'approve', EARLY)).rejects.toThrow('No seats left');
    expect((await api.reservations.counts())[`side-event:${ROUNDTABLES}`]).toBe(35);
  });

  it.each([40, 0])('refuses approval when the applicant already has a reservation (capacity %i)', async (capacity) => {
    const { api } = loadApi();
    const key = `side-event:${CLINIC}`;
    const app = await api.applications.apply(request('acct-media'));
    const reservation = await api.reservations.reserve('acct-media', key, capacity, EARLY);
    expect(reservation.status).toBe(capacity ? 'reserved' : 'waitlist');
    const before = await api.reservations.counts();
    await expect(api.applications.decide('acct-investor', app.id, 'approve', EARLY)).rejects.toThrow('Already has a seat');
    expect(await api.reservations.counts()).toEqual(before);
    expect((await api.applications.listMine({ accountId: 'acct-media' }))[0].status).toBe('pending');
  });

  it('refuses a reservation when the account has an approved request for that side event', async () => {
    const { api } = loadApi();
    const key = `side-event:${CLINIC}`;
    const app = await api.applications.apply(request('acct-media'));
    await api.applications.decide('acct-investor', app.id, 'approve', EARLY);
    await expect(api.reservations.reserve('acct-media', key, 40, EARLY)).rejects.toThrow('Already has a seat');
    expect((await api.me.get('acct-media'))?.reservations).toEqual([]);
    expect((await api.reservations.counts())[key]).toBe(1);
    // Another account and a session key remain independent of this side event's approval.
    expect((await api.reservations.reserve('acct-corporate', key, 40, EARLY)).status).toBe('reserved');
    expect((await api.reservations.reserve('acct-media', 'session:s-hiring-first-ten', 100, EARLY)).status).toBe('reserved');
    await api.applications.withdraw(app.id, { accountId: 'acct-media' });
    expect((await api.reservations.reserve('acct-media', key, 40, EARLY)).status).toBe('reserved');
    expect((await api.reservations.reserve('acct-media', key, 40, EARLY)).status).toBe('reserved');
  });

  it('withdrawing an approved request frees its seat', async () => {
    const { api } = loadApi();
    const app = await api.applications.apply(request('acct-media'));
    await api.applications.decide('acct-investor', app.id, 'approve', EARLY);
    await expect(api.applications.withdraw(app.id, { accountId: 'acct-corporate' })).rejects.toThrow('Request not found');
    await api.applications.withdraw(app.id, { accountId: 'acct-media' });
    expect(await api.applications.seatsLeft(CLINIC, EARLY)).toBe(40);
  });

  it('remembers a visitor by email, so their request is found again', async () => {
    const { api } = loadApi();
    await api.applications.apply({ ...request(null), email: 'Sam@Example.com' });
    expect(await api.applications.visitorEmail()).toBe('sam@example.com');
    expect(await api.applications.listMine({ email: 'sam@example.com' })).toHaveLength(1);
    expect(await api.applications.listMine({ accountId: 'acct-founder' })).toHaveLength(0);
  });

  it('assigns sub-admins for the admin only', async () => {
    const { api } = loadApi();
    await expect(api.applications.assignAdmin('acct-investor', CLINIC, 'acct-media')).rejects.toThrow('Not allowed');
    await api.applications.assignAdmin('acct-founder', CLINIC, 'acct-media');
    expect(await api.applications.myAdminEvents('acct-media')).toEqual([CLINIC]);
    expect(await api.applications.myAdminEvents('acct-investor')).toEqual([ROUNDTABLES]);
    await api.applications.assignAdmin('acct-founder', CLINIC, null);
    expect(await api.applications.admins()).toEqual({ [ROUNDTABLES]: 'acct-investor' });
  });

  it('scores the seeded accounts into the fit labels, best first', async () => {
    const { api } = loadApi();
    for (const id of ['acct-media', 'acct-founder', 'acct-investor']) await api.applications.apply(request(id));
    const rows = await api.applications.listForEvent('acct-investor', CLINIC);
    expect(rows.map((r) => [r.application.accountId, r.label])).toEqual([
      ['acct-investor', 'Good fit'],
      ['acct-founder', 'Good fit'],
      ['acct-media', 'Weak fit'],
    ]);
    expect(rows[1].reason).toBe('Matches your interest in Early Stage (Pre-Seed and Seed)');

    await api.applications.apply(request('acct-investor', ROUNDTABLES));
    await api.applications.apply(request('acct-founder', ROUNDTABLES));
    const roundtables = await api.applications.listForEvent('acct-investor', ROUNDTABLES);
    expect(roundtables.map((r) => r.label)).toEqual(['Strong fit', 'Weak fit']);
  });

  it('scores a visitor from the interests they picked', async () => {
    const { api } = loadApi();
    await api.applications.apply({
      ...request(null),
      selections: ['group-startup-stage-early-stage-pre-seed-and-seed'],
      note: 'Raising a seed round',
    });
    const [row] = await api.applications.listForEvent('acct-investor', CLINIC);
    expect(row.reason).toBe('Matches your interest in Early Stage (Pre-Seed and Seed)');
    expect(row.label).not.toBe('Weak fit');
  });
});
