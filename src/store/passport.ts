import { useEffect, useState } from 'react';

import { api, type LeaderboardRow } from '@/backend/api';
import type { Stamp } from '@/backend/types';
import { requireSignIn } from '@/components/auth/require-sign-in';
import { listChallenges, listStampTargets } from '@/data';
import { passportProgress, withStamp, type PassportProgress } from '@/lib/passport';
import { useStoreValue } from '@/store/context';
import { nextId } from '@/store/ids';

export type LeaderboardEntry = { name: string; points: number; rank: number; isMe: boolean };

function toEntries(rows: LeaderboardRow[], me: string | null): LeaderboardEntry[] {
  return rows.map((row) => ({
    name: row.name,
    points: row.points,
    rank: row.rank,
    isMe: me !== null && row.accountId === me,
  }));
}

type CollectContext = Pick<ReturnType<typeof useStoreValue>, 'setState' | 'accountIdRef'>;

/**
 * The one path that collects a stamp for every target kind: the backend records it, then the
 * account's state gains the stamp and its "Stamp collected" activity line. True when newly collected.
 */
export async function collectStamp({ setState, accountIdRef }: CollectContext, targetId: string): Promise<boolean> {
  const id = accountIdRef.current;
  if (id === null) {
    requireSignIn();
    return false;
  }
  let newly: boolean;
  try {
    newly = await api.passport.collect(id, targetId);
  } catch {
    return false;
  }
  if (accountIdRef.current !== id) return false;
  if (newly) {
    const at = new Date().toISOString();
    setState((s) => withStamp(s, targetId, listStampTargets(), at, nextId('act')));
  }
  return newly;
}

export function usePassport(): {
  stamps: Stamp[];
  has: (targetId: string) => boolean;
  collect: (targetId: string) => Promise<boolean>;
  progress: PassportProgress;
  leaderboard: LeaderboardEntry[];
  refreshLeaderboard: () => Promise<void>;
} {
  const { state, setState, accountId, accountIdRef } = useStoreValue();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const progress = passportProgress(state.stamps, listStampTargets(), listChallenges());

  const refreshLeaderboard = async (): Promise<void> => {
    const id = accountIdRef.current;
    try {
      const rows = await api.passport.leaderboard();
      if (accountIdRef.current !== id) return;
      setLeaderboard(toEntries(rows, id));
    } catch {
      // Keep the last leaderboard; the next refresh tries again.
    }
  };

  // Reload when the account changes, so isMe and the points follow the signed-in account.
  useEffect(() => {
    let cancelled = false;
    api.passport
      .leaderboard()
      .then((rows) => {
        if (!cancelled) setLeaderboard(toEntries(rows, accountId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const has = (targetId: string): boolean =>
    state.stamps.some((stamp) => stamp.targetId === targetId);

  const collect = async (targetId: string): Promise<boolean> => {
    const newly = await collectStamp({ setState, accountIdRef }, targetId);
    if (newly) await refreshLeaderboard();
    return newly;
  };

  return {
    stamps: state.stamps,
    has,
    collect,
    progress,
    leaderboard,
    refreshLeaderboard,
  };
}
