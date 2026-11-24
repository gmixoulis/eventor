import { completedGroups, passportLayout } from '@/components/passport/passport-logic';
import { listChallenges, listStampTargets } from '@/data';
import { usePassport, useSession } from '@/store';

/** The constellation inputs shared by the passport and the share view. */
export function usePassportSky(width: number) {
  const passport = usePassport();
  const { account } = useSession();
  const targets = listStampTargets();
  const challenges = listChallenges();
  const layout = passportLayout(targets, account?.id ?? 'guest', width);
  const collected = targets.filter((t) => passport.has(t.id)).map((t) => t.id);
  return {
    passport,
    targets,
    challenges,
    layout,
    collected,
    groups: completedGroups(challenges, passport.progress.challenges),
  };
}
