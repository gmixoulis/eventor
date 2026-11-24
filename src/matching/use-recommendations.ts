import { useEffect, useState, useSyncExternalStore } from 'react';

import { getEmbedder, subscribe, vectorsFor } from '@/matching/active';
import { buildMe, buildOthers } from '@/matching/inputs';
import { recommend } from '@/matching/pipeline';
import type { Match } from '@/matching/types';
import { useStore } from '@/store';

export type Recommendations = {
  matches: Match[];
  byPerson: Record<string, Match>;
  embedderId: string;
  ready: boolean;
};

export function useRecommendations(): Recommendations {
  const { state } = useStore();
  const embedderId = useSyncExternalStore(subscribe, () => getEmbedder().id);

  const me = buildMe(state.profile, state.meetings);
  const blocked = new Set(state.profile.blocked);
  const others = buildOthers().filter((other) => !blocked.has(other.id));

  const [result, setResult] = useState<Omit<Recommendations, 'embedderId'>>({
    matches: [],
    byPerson: {},
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const embedder = getEmbedder();
      const vectors = await vectorsFor(embedder, [me, ...others]);
      const taste = state.matching.embedderId === embedder.id ? state.matching.taste : undefined;
      const matches = recommend({
        me,
        others,
        vectors,
        ranker: state.matching.ranker,
        taste,
        impressions: state.matching.impressions,
        hidden: state.matching.hiddenPeople,
        now: new Date(),
        embedderId: embedder.id,
      });
      if (cancelled) return;
      const byPerson: Record<string, Match> = {};
      for (const match of matches) byPerson[match.personId] = match;
      setResult({ matches, byPerson, ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [me, others, state.matching, embedderId]);

  return { ...result, embedderId };
}
