import { listSessions } from '@/data';
import { toggleIn } from '@/lib/utils';
import { useStoreValue } from '@/store/context';

export function useFollows(): {
  isFollowing: (speakerId: string) => boolean;
  toggle: (speakerId: string) => void;
  sessionIds: string[];
} {
  const { state, setState } = useStoreValue();
  const speakers = state.follows.speakers;
  return {
    isFollowing: (speakerId: string) => speakers.includes(speakerId),
    toggle: (speakerId: string) =>
      setState((s) => ({
        ...s,
        follows: { ...s.follows, speakers: toggleIn(s.follows.speakers, speakerId) },
      })),
    sessionIds:
      speakers.length === 0
        ? []
        : listSessions({ speakerIds: speakers }).map((session) => session.id),
  };
}
