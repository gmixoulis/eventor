import { makeDefaultMatching } from '@/backend/state';
import { getPerson } from '@/data';
import { getEmbedder, vectorsFor } from '@/matching/active';
import { buildMe, buildOthers, toMatchProfile } from '@/matching/inputs';
import { type MatchSignal, SIGNALS } from '@/matching/weights';
import { useStoreValue } from '@/store/context';
import { FEEDBACK_LIMIT, prepareLearning } from '@/store/learning';

export function useMatchFeedback() {
  const { state, setState, accountIdRef, learningGenRef } = useStoreValue();

  /** Learn from a signal. Never rejects; a failure or a stale result drops the update quietly. */
  const record = async (personId: string, signal: MatchSignal): Promise<void> => {
    const owner = { accountId: accountIdRef.current, generation: learningGenRef.current };
    if (owner.accountId === null) return; // guests do not learn
    const person = getPerson(personId);
    if (!person) return;
    const me = buildMe(state.profile, state.meetings);
    const them = toMatchProfile(person);
    const blocked = new Set(state.profile.blocked);
    const others = buildOthers().filter((other) => !blocked.has(other.id));
    const embedder = getEmbedder();
    const update = await prepareLearning({
      owner,
      currentOwner: () => ({ accountId: accountIdRef.current, generation: learningGenRef.current }),
      buildVectors: () => vectorsFor(embedder, [me, them]),
      input: { me, them, others, embedderId: embedder.id, personId, signal },
    });
    // null: embedding failed or the account/reset changed meanwhile; the learning update is dropped.
    if (update) setState((s) => ({ ...s, matching: update(s.matching) }));
  };

  return {
    record,
    bookmark: (personId: string) => {
      setState((s) =>
        s.matching.bookmarkedPeople.includes(personId)
          ? s
          : {
              ...s,
              matching: {
                ...s.matching,
                bookmarkedPeople: [...s.matching.bookmarkedPeople, personId],
              },
            },
      );
      void record(personId, 'bookmark');
    },
    unbookmark: (personId: string) =>
      setState((s) => ({
        ...s,
        matching: {
          ...s.matching,
          bookmarkedPeople: s.matching.bookmarkedPeople.filter((id) => id !== personId),
        },
      })),
    hide: (personId: string) => {
      setState((s) =>
        s.matching.hiddenPeople.includes(personId)
          ? s
          : {
              ...s,
              matching: { ...s.matching, hiddenPeople: [...s.matching.hiddenPeople, personId] },
            },
      );
      void record(personId, 'hide');
    },
    unhide: (personId: string) =>
      setState((s) => ({
        ...s,
        matching: {
          ...s.matching,
          hiddenPeople: s.matching.hiddenPeople.filter((id) => id !== personId),
        },
      })),
    impress: (personIds: string[]) => {
      if (personIds.length === 0) return;
      setState((s) => {
        const impressions = { ...s.matching.impressions };
        const feedback = [...s.matching.feedback];
        for (const personId of personIds) {
          if (!getPerson(personId)) continue;
          const next = (impressions[personId] ?? 0) + 1;
          impressions[personId] = next;
          const positive = feedback.some(
            (f) => f.personId === personId && SIGNALS[f.signal].label === 1,
          );
          if (next > 3 && !positive) {
            feedback.unshift({
              personId,
              signal: 'impression_ignored',
              at: new Date().toISOString(),
            });
          }
        }
        return {
          ...s,
          matching: { ...s.matching, impressions, feedback: feedback.slice(0, FEEDBACK_LIMIT) },
        };
      });
    },
    bookmarked: state.matching.bookmarkedPeople,
    hidden: state.matching.hiddenPeople,
    resetLearning: () => {
      learningGenRef.current += 1;
      setState((s) => ({ ...s, matching: makeDefaultMatching() }));
    },
  };
}
