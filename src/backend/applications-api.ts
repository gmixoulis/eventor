import { getDb, load, scheduleWrite } from '@/backend/db';
import { delay } from '@/backend/latency';
import { walkInsAt } from '@/backend/reservations-api';
import { assertNoSideEventSeat } from '@/backend/side-event-seat';
import type { Application } from '@/backend/types';
import { getSideEvent } from '@/data';
import { sideEventToItem, withAgendaEntry } from '@/lib/agenda-item';
import {
  apply as fileApplication,
  canManage,
  decide as decideApplication,
  filedBy,
  fitLabel,
  sortForReview,
  withdraw as withdrawApplication,
  type ApplicationInput,
  type Decision,
  type FitLabel,
  type Requester,
} from '@/lib/applications';
import { takenSeats } from '@/lib/live-status';
import { getEmbedder } from '@/matching/active';
import { recommendAgenda } from '@/matching/agenda-recs';
import { profileText } from '@/matching/inputs';

export type ReviewRow = { application: Application; score: number; label: FitLabel; reason: string | null };

function isAdmin(accountId: string): boolean {
  return getDb().accounts[accountId]?.permission === 'admin';
}

function eventOrThrow(sideEventId: string) {
  const event = getSideEvent(sideEventId);
  if (!event) throw new Error('Side event not found');
  return event;
}

function assertManager(accountId: string, sideEventId: string): void {
  if (!canManage(sideEventId, accountId, getDb().shared.sideEventAdmins, isAdmin(accountId))) {
    throw new Error('Not allowed');
  }
}

/** Seats left at the event clock's `now`: reserved seats plus simulated walk-ins count as taken. */
function seatsLeft(sideEventId: string, now: Date): number {
  const event = eventOrThrow(sideEventId);
  if (event.capacity === undefined) return Infinity;
  const key = sideEventToItem(event).key;
  return event.capacity - takenSeats(event.capacity, getDb().shared.reserved[key] ?? 0, walkInsAt(key, now));
}

function changeSeats(sideEventId: string, by: 1 | -1): void {
  const reserved = getDb().shared.reserved;
  const key = sideEventToItem(eventOrThrow(sideEventId)).key;
  reserved[key] = Math.max(0, (reserved[key] ?? 0) + by);
}

/** Tells an applicant with an account about a decision; an approved event goes into their agenda with its reminder. */
function notifyApplicant(application: Application): void {
  const state = application.accountId === null ? undefined : getDb().states[application.accountId];
  const event = getSideEvent(application.sideEventId);
  if (!state || !event) return;
  const approved = application.status === 'approved';
  const next = approved ? withAgendaEntry(state, sideEventToItem(event)) : state;
  getDb().states[application.accountId as string] = {
    ...next,
    activity: [
      {
        id: `act-request-${application.id}-${application.status}`,
        kind: 'reservation',
        title: approved ? `Your request was approved: you are in for ${event.title}` : `Your request for ${event.title} was not approved`,
        body: '',
        date: application.decidedAt ?? new Date().toISOString(),
      },
      ...next.activity,
    ],
  };
}

/** Fit of each request for its event: the applicant's profile, or a visitor's picked interests and note. */
async function scoreApplications(apps: Application[], sideEventId: string): Promise<ReviewRow[]> {
  const event = eventOrThrow(sideEventId);
  const candidate = { item: sideEventToItem(event), text: `${event.title} ${event.description}`, interestIds: event.interestIds };
  const rows = await Promise.all(
    apps.map(async (application) => {
      const profile = application.accountId === null ? undefined : getDb().states[application.accountId]?.profile;
      const interestIds = profile ? profile.selections.map((s) => s.interestId) : (application.selections ?? []);
      const text = profile
        ? profileText(profile)
        : profileText({
            id: application.id,
            selections: interestIds.map((interestId) => ({ interestId, goalId: '' })),
            intro: application.note,
            title: '',
            company: '',
            industry: '',
          });
      const [rec] = await recommendAgenda(text, interestIds, [candidate], getEmbedder());
      return { application, score: rec.score, label: fitLabel(rec.score), reason: rec.reason };
    }),
  );
  return sortForReview(rows);
}

export const applicationsApi = {
  /** POST /side-events/:id/applications (a second open request returns the first one) */
  async apply(input: ApplicationInput): Promise<Application> {
    await load();
    await delay();
    const event = eventOrThrow(input.sideEventId);
    if (event.capacity === undefined) throw new Error('This side event takes no requests');
    if (input.accountId !== null && !getDb().states[input.accountId]) throw new Error(`Unknown account ${input.accountId}`);
    const db = getDb();
    const result = fileApplication(db.shared.applications, input, `app-${Date.now()}-${db.shared.applications.length}`, new Date().toISOString());
    if (!result.ok) throw new Error(result.error);
    db.shared.applications = result.apps;
    // A visitor's requests are found again by the email they last used on this phone.
    if (input.accountId === null) db.session.visitorEmail = result.application.email;
    scheduleWrite();
    return result.application;
  },
  /** DELETE /applications/:id (an approved request gives its seat back) */
  async withdraw(id: string, requester: Requester): Promise<Application> {
    await load();
    await delay();
    const db = getDb();
    const result = withdrawApplication(db.shared.applications, id, requester, new Date().toISOString());
    if (!result.ok) throw new Error(result.error);
    db.shared.applications = result.apps;
    if (result.freedSeat) changeSeats(result.application.sideEventId, -1);
    scheduleWrite();
    return result.application;
  },
  /** GET /me/applications (an account's requests, or a visitor's by email) */
  async listMine(requester: Requester): Promise<Application[]> {
    await load();
    await delay();
    return getDb().shared.applications.filter((a) => filedBy(a, requester));
  },
  /** The email a visitor last requested a place with on this phone, or null. */
  async visitorEmail(): Promise<string | null> {
    await load();
    return getDb().session.visitorEmail ?? null;
  },
  /** GET /side-events/:id/applications (that event's sub-admin or the admin), pending first, then best fit */
  async listForEvent(accountId: string, sideEventId: string): Promise<ReviewRow[]> {
    await load();
    await delay();
    assertManager(accountId, sideEventId);
    return scoreApplications(getDb().shared.applications.filter((a) => a.sideEventId === sideEventId), sideEventId);
  },
  /** Seats left for a side event at the event clock's `now`. */
  async seatsLeft(sideEventId: string, now: Date): Promise<number> {
    await load();
    return seatsLeft(sideEventId, now);
  },
  /** POST /applications/:id/decision (approve takes a seat; refused with "No seats left" when full) */
  async decide(accountId: string, id: string, decision: Decision, now: Date): Promise<Application> {
    await load();
    await delay();
    const db = getDb();
    const app = db.shared.applications.find((a) => a.id === id);
    if (app && decision === 'approve') {
      assertManager(accountId, app.sideEventId);
      assertNoSideEventSeat(app.accountId, app.sideEventId, 'reservation');
    }
    const free = app ? seatsLeft(app.sideEventId, now) > 0 : false;
    const result = decideApplication(
      db.shared.applications, id, decision, accountId, db.shared.sideEventAdmins, isAdmin(accountId), free, new Date().toISOString(),
    );
    if (!result.ok) throw new Error(result.error);
    db.shared.applications = result.apps;
    if (result.application.status === 'approved') changeSeats(result.application.sideEventId, 1);
    notifyApplicant(result.application);
    scheduleWrite();
    return result.application;
  },
  /** PUT /side-events/:id/admin (admin only; null removes the sub-admin) */
  async assignAdmin(accountId: string, sideEventId: string, adminId: string | null): Promise<Record<string, string>> {
    await load();
    await delay();
    if (!isAdmin(accountId)) throw new Error('Not allowed');
    eventOrThrow(sideEventId);
    const db = getDb();
    if (adminId !== null && !db.accounts[adminId]) throw new Error(`Unknown account ${adminId}`);
    const next = { ...db.shared.sideEventAdmins };
    if (adminId === null) delete next[sideEventId];
    else next[sideEventId] = adminId;
    db.shared.sideEventAdmins = next;
    scheduleWrite();
    return next;
  },
  /** GET /side-events/admins (side event id to its sub-admin's account id) */
  async admins(): Promise<Record<string, string>> {
    await load();
    await delay();
    return { ...getDb().shared.sideEventAdmins };
  },
  /** GET /me/admin-events (the side events this account is sub-admin of) */
  async myAdminEvents(accountId: string): Promise<string[]> {
    await load();
    await delay();
    return Object.entries(getDb().shared.sideEventAdmins)
      .filter(([, id]) => id === accountId)
      .map(([sideEventId]) => sideEventId);
  },
};
