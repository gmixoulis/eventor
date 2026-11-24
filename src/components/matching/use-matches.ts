import { useRecommendations } from '@/matching/use-recommendations';
import { useProfile } from '@/store';

export function useMatches() {
  const result = useRecommendations();
  const { profile } = useProfile();
  return profile.networking ? result : { ...result, matches: [], byPerson: {} };
}
