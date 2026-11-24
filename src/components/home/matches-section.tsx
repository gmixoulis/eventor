import { HomeList, HomeSection } from '@/components/home/section';
import { MatchCard } from '@/components/matching/match-card';
import { getPerson } from '@/data';
import { useRecommendations } from '@/matching/use-recommendations';
import { useMatchFeedback } from '@/store';

export function MatchesSection() {
  const { matches } = useRecommendations();
  const { hide } = useMatchFeedback();
  const rows = matches.flatMap((match) => {
    const person = getPerson(match.personId);
    return person ? [{ person, match }] : [];
  }).slice(0, 3);
  if (!rows.length) return null;
  return <HomeSection title="People to meet" href="/people">
    <HomeList>
      {rows.map(({ person, match }) => <MatchCard key={person.id} compact person={person} match={match} onHide={() => hide(person.id)} />)}
    </HomeList>
  </HomeSection>;
}
