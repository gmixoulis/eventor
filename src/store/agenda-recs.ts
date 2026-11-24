import { useEffect, useState } from 'react';

import { listInterests, listSessions, listSideEvents, listTracks } from '@/data';
import { itemEndMs, sessionToItem, sideEventToItem, type AgendaItem } from '@/lib/agenda-item';
import { getEmbedder } from '@/matching/active';
import { recommendAgenda, type AgendaRecInput } from '@/matching/agenda-recs';
import { profileText } from '@/matching/inputs';
import { useMyAgenda } from '@/store/agenda';
import { useStoreValue } from '@/store/context';
import { useEventClock } from '@/store/event-clock';

/** A track maps to an interest only when their names match (for example Fintech). */
function sessionInterestIds(trackId: string): string[] {
  const track = listTracks().find((t) => t.id === trackId);
  const interest = track ? listInterests().find((i) => i.name === track.name) : undefined;
  return interest ? [interest.id] : [];
}

/** Every session and side event, as recommendation candidates. */
function candidates(): AgendaRecInput[] {
  return [
    ...listSessions().map((session) => ({
      item: sessionToItem(session),
      text: `${session.title} ${session.description}`,
      interestIds: sessionInterestIds(session.trackId),
    })),
    ...listSideEvents().map((event) => ({
      item: sideEventToItem(event),
      text: `${event.title} ${event.description}`,
      interestIds: event.interestIds,
    })),
  ];
}

type Ranked = { owner: string | null; rows: { item: AgendaItem; reason: string | null }[] };

/**
 * Sessions and side events recommended for the profile, best first, without items already in
 * the agenda or already ended by the event clock. `ready` turns true once the first ranking is in.
 */
export function useAgendaRecs(limit: number): {
  recs: { item: AgendaItem; reason: string | null }[];
  ready: boolean;
} {
  const { state, accountId, accountIdRef } = useStoreValue();
  const { now } = useEventClock();
  const agenda = useMyAgenda();
  const [ranked, setRanked] = useState<Ranked | null>(null);

  // Rank everything once per profile; the agenda and clock filters below need no new embedding.
  useEffect(() => {
    let cancelled = false;
    const owner = accountIdRef.current;
    const pool = candidates();
    const selectionIds = state.profile.selections.map((selection) => selection.interestId);
    recommendAgenda(profileText(state.profile), selectionIds, pool, getEmbedder())
      .then((scored) => {
        // Drop the result if the account changed during the await.
        if (cancelled || accountIdRef.current !== owner) return;
        const byKey = new Map(pool.map((candidate) => [candidate.item.key, candidate.item]));
        const rows = scored.flatMap((row) => {
          const item = byKey.get(row.key);
          return item ? [{ item, reason: row.reason }] : [];
        });
        setRanked({ owner, rows });
      })
      .catch(() => {
        if (!cancelled) setRanked({ owner, rows: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [state.profile, accountIdRef]);

  if (ranked === null || ranked.owner !== accountId) return { recs: [], ready: false };
  const inAgenda = new Set(agenda.map((item) => item.key));
  const nowMs = now.getTime();
  const recs = ranked.rows
    .filter((row) => !inAgenda.has(row.item.key) && itemEndMs(row.item) > nowMs)
    .slice(0, limit);
  return { recs, ready: true };
}
