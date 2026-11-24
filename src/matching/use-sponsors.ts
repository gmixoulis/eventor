import { useEffect, useState } from 'react';

import { getInterest, listSponsors } from '@/data';
import { getEmbedder, interestVectors, vectorsFor } from '@/matching/active';
import { buildMe } from '@/matching/inputs';
import { scoreSponsors, type SponsorInput, type SponsorScore } from '@/matching/sponsors';
import { useStore } from '@/store';

export function useSponsorRecommendations(): SponsorScore[] {
  const { state } = useStore();
  const [recommended, setRecommended] = useState<SponsorScore[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = state.profile;
      if (profile.selections.length === 0) {
        if (!cancelled) setRecommended([]);
        return;
      }
      const me = buildMe(profile, state.meetings);
      const embedder = getEmbedder();
      const sponsors: SponsorInput[] = listSponsors().flatMap((tier) =>
        tier.sponsors.map((sponsor) => ({
          id: sponsor.id,
          description: sponsor.description,
          interestIds: sponsor.interestIds,
        })),
      );
      const [interestVec, meVecs, sponsorText] = await Promise.all([
        interestVectors(embedder),
        vectorsFor(embedder, [me]),
        embedder.embed(sponsors.map((sponsor) => sponsor.description)),
      ]);
      const scored = scoreSponsors({
        me,
        meVec: meVecs[me.id],
        sponsors,
        interestVec,
        sponsorText,
        interestName: (id) => getInterest(id)?.name,
      });
      if (!cancelled) setRecommended(scored.slice(0, 3));
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  return recommended;
}
