/** Pure side-event request rules, so the API layer and tests share one source of truth. */
import type { Application } from '@/backend/types';

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const NOTE_MAX = 280;

/** Fit score cut-offs, set from the seeded accounts against the seeded side events (see the tests). */
export const STRONG_FIT = 0.7;
export const GOOD_FIT = 0.35;

export type ApplicationInput = {
  sideEventId: string;
  accountId: string | null;
  name: string;
  email: string;
  note: string;
  selections?: string[];
};

/** Who is asking: a signed-in account, or a visitor known only by email. */
export type Requester = { accountId: string } | { email: string };

export type ApplicationResult = { ok: true; apps: Application[]; application: Application } | { ok: false; error: string };

export type Decision = 'approve' | 'reject';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The form errors for a request, or null when it can be sent. */
export function applicationError(input: Pick<ApplicationInput, 'name' | 'email' | 'note'>): string | null {
  const name = input.name.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return `Name must be ${NAME_MIN} to ${NAME_MAX} characters`;
  if (!EMAIL.test(normalizeEmail(input.email))) return 'Enter a valid email';
  if (input.note.length > NOTE_MAX) return `Note is too long (${input.note.length}/${NOTE_MAX})`;
  return null;
}

export function isOpen(app: Application): boolean {
  return app.status === 'pending' || app.status === 'approved';
}

/** True when the application was filed by this requester: by account, or by email for a visitor's request. */
export function filedBy(app: Application, requester: Requester): boolean {
  if ('accountId' in requester) return app.accountId === requester.accountId;
  return app.accountId === null && app.email === normalizeEmail(requester.email);
}

/**
 * File a request. One open request (pending or approved) per side event per account, or per
 * email for visitors: asking again returns the existing one and leaves the list unchanged.
 */
export function apply(apps: Application[], input: ApplicationInput, id: string, now: string): ApplicationResult {
  const error = applicationError(input);
  if (error) return { ok: false, error };
  const email = normalizeEmail(input.email);
  const requester: Requester = input.accountId === null ? { email } : { accountId: input.accountId };
  const existing = apps.find((a) => a.sideEventId === input.sideEventId && isOpen(a) && filedBy(a, requester));
  if (existing) return { ok: true, apps, application: existing };
  const application: Application = {
    id,
    sideEventId: input.sideEventId,
    accountId: input.accountId,
    name: input.name.trim(),
    email,
    note: input.note.trim(),
    ...(input.accountId === null ? { selections: input.selections ?? [] } : {}),
    status: 'pending',
    createdAt: now,
  };
  return { ok: true, apps: [...apps, application], application };
}

/** True when the account may see and decide the requests of a side event: its sub-admin or the app admin. */
export function canManage(
  sideEventId: string,
  accountId: string,
  admins: Record<string, string>,
  isAdmin: boolean,
): boolean {
  return isAdmin || admins[sideEventId] === accountId;
}

function replaced(apps: Application[], next: Application): Application[] {
  return apps.map((a) => (a.id === next.id ? next : a));
}

/** Approve or reject a pending request. Only that event's sub-admin or the admin; approve needs a free seat. */
export function decide(
  apps: Application[],
  id: string,
  decision: Decision,
  deciderId: string,
  admins: Record<string, string>,
  isAdmin: boolean,
  seatsFree: boolean,
  now: string,
): ApplicationResult {
  const app = apps.find((a) => a.id === id);
  if (!app) return { ok: false, error: 'Request not found' };
  if (!canManage(app.sideEventId, deciderId, admins, isAdmin)) return { ok: false, error: 'Not allowed' };
  if (app.status !== 'pending') return { ok: false, error: 'Already decided' };
  if (decision === 'approve' && !seatsFree) return { ok: false, error: 'No seats left' };
  const application: Application = {
    ...app,
    status: decision === 'approve' ? 'approved' : 'rejected',
    decidedAt: now,
    decidedBy: deciderId,
  };
  return { ok: true, apps: replaced(apps, application), application };
}

/** Withdraw an open request; only its requester. The caller frees the seat when it was approved. */
export function withdraw(
  apps: Application[],
  id: string,
  requester: Requester,
  now: string,
): ApplicationResult & { freedSeat?: boolean } {
  const app = apps.find((a) => a.id === id);
  if (!app || !filedBy(app, requester)) return { ok: false, error: 'Request not found' };
  if (!isOpen(app)) return { ok: false, error: 'Already closed' };
  const application: Application = { ...app, status: 'withdrawn', decidedAt: now };
  return { ok: true, apps: replaced(apps, application), application, freedSeat: app.status === 'approved' };
}

export type FitLabel = 'Strong fit' | 'Good fit' | 'Weak fit';

export function fitLabel(score: number): FitLabel {
  if (score >= STRONG_FIT) return 'Strong fit';
  return score >= GOOD_FIT ? 'Good fit' : 'Weak fit';
}

/** Pending first, then the best fit; ties keep the order they were filed in. */
export function sortForReview<T extends { application: Application; score: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pending = Number(b.application.status === 'pending') - Number(a.application.status === 'pending');
    return pending || b.score - a.score || a.application.createdAt.localeCompare(b.application.createdAt);
  });
}
