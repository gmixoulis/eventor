import { useCallback, useEffect, useState } from 'react';

import { api } from '@/backend/api';
import type { ReviewRow } from '@/backend/applications-api';
import type { Application } from '@/backend/types';
import type { OrganizerRole } from '@/components/auth/routes';
import { getSideEvent } from '@/data';
import { sideEventToItem } from '@/lib/agenda-item';
import type { Decision, Requester } from '@/lib/applications';
import { mergeFeatures } from '@/lib/features';
import { liveStatus } from '@/lib/live-status';
import { useStoreValue } from '@/store/context';
import { useEventClock } from '@/store/event-clock';
import { withoutReservation } from '@/store/reservations';

const FAILED = 'That did not go through. Please try again.';

function message(error: unknown): string {
  return error instanceof Error ? error.message : FAILED;
}

/**
 * The signed-in account's organizer role and the side events it is sub-admin of. With side event
 * requests switched off a sub-admin has nothing to look after, so only the admin keeps the tools.
 */
export function useOrganizerRole(): OrganizerRole & { adminEvents: string[] } {
  const { accountId, accounts, sideEventAdmins, device } = useStoreValue();
  const isAdmin = accountId !== null && accounts.find((a) => a.id === accountId)?.permission === 'admin';
  const adminEvents = Object.keys(sideEventAdmins).filter((id) => accountId !== null && sideEventAdmins[id] === accountId);
  const requestsOn = mergeFeatures(device.features).sideEventRequests;
  return { isAdmin, isSubAdmin: requestsOn && adminEvents.length > 0, adminEvents };
}

/** Every side event's sub-admin, and the admin's action to change one. Returns an error message or null. */
export function useSideEventAdmins() {
  const { accountIdRef, sideEventAdmins, setSideEventAdmins } = useStoreValue();
  const assign = async (sideEventId: string, adminId: string | null): Promise<string | null> => {
    const id = accountIdRef.current;
    if (id === null) return 'Not allowed';
    try {
      setSideEventAdmins(await api.applications.assignAdmin(id, sideEventId, adminId));
      return null;
    } catch (error) {
      return message(error);
    }
  };
  return { admins: sideEventAdmins, assign };
}

export type RequestInput = { name: string; email: string; note: string; selections?: string[] };

/**
 * The signed-in account's latest request for one side event, or a visitor's, found by the email
 * they last used on this phone. `send` and `withdraw` return an error message or null.
 */
export function useMyRequest(sideEventId: string) {
  const { accountId, accountIdRef, setState, refreshReservations } = useStoreValue();
  const [mine, setMine] = useState<Application | undefined>(undefined);
  const [visitorEmail, setVisitorEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const email = accountId === null ? await api.applications.visitorEmail() : null;
      const requester: Requester | null = accountId !== null ? { accountId } : email ? { email } : null;
      const list = requester ? await api.applications.listMine(requester) : [];
      if (cancelled) return;
      setVisitorEmail(email);
      setMine(list.filter((a) => a.sideEventId === sideEventId).at(-1));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, sideEventId]);

  const send = async (input: RequestInput): Promise<string | null> => {
    try {
      const app = await api.applications.apply({ sideEventId, accountId, ...input });
      if (accountIdRef.current !== accountId) return null;
      setMine(app);
      if (accountId === null) setVisitorEmail(app.email);
      return null;
    } catch (error) {
      return message(error);
    }
  };

  const withdraw = async (): Promise<string | null> => {
    if (!mine) return null;
    const requester: Requester = accountId !== null ? { accountId } : { email: mine.email };
    try {
      const app = await api.applications.withdraw(mine.id, requester);
      if (accountIdRef.current !== accountId) return null;
      setMine(app);
      // A freed seat also turns the event's reminder off; it stays in the agenda, as after a cancelled seat.
      if (accountId !== null && mine.status === 'approved') setState((s) => withoutReservation(s, `side-event:${sideEventId}`));
      await refreshReservations();
      return null;
    } catch (error) {
      return message(error);
    }
  };

  return { mine, visitorEmail, send, withdraw };
}

/** A side event's requests for its sub-admin or the admin, best fit first, with the seats left. */
export function useEventRequests(sideEventId: string) {
  const { accountId, accountIdRef, reservedCounts, setState, refreshReservations } = useStoreValue();
  const { now } = useEventClock();
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const event = getSideEvent(sideEventId);
  const item = event ? sideEventToItem(event) : null;
  const seatsLeft = item?.capacity === undefined
    ? null
    : item.capacity - liveStatus(item, now, reservedCounts[item.key] ?? 0).taken;

  const reload = useCallback(() => {
    const id = accountId;
    if (id === null) return;
    return api.applications.listForEvent(id, sideEventId)
      .then((list) => {
        if (accountIdRef.current !== id) return;
        setRows(list);
        setError(null);
      })
      .catch((error: unknown) => {
        if (accountIdRef.current !== id) return;
        setRows(null);
        setError(message(error));
      });
  }, [accountId, accountIdRef, sideEventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const decide = async (applicationId: string, decision: Decision): Promise<string | null> => {
    const id = accountIdRef.current;
    if (id === null) return 'Not allowed';
    try {
      const app = await api.applications.decide(id, applicationId, decision, now);
      // Deciding on your own request: the signed-in state would otherwise overwrite the stored notice.
      if (app.accountId === id) {
        const fresh = await api.me.get(id);
        if (fresh) setState(fresh);
      }
      await Promise.all([reload(), refreshReservations()]);
      return null;
    } catch (error) {
      return message(error);
    }
  };

  return { rows, seatsLeft, error, decide };
}
