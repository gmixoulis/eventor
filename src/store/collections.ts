import { api } from '@/backend/api';
import type { Lead, StoreState } from '@/backend/types';
import { getStampTarget, stampTargetId } from '@/data';
import { agendaKey } from '@/lib/agenda-item';
import { addIn, toggleIn } from '@/lib/utils';
import { useStoreValue } from '@/store/context';
import { nextId } from '@/store/ids';
import { useMatchFeedback } from '@/store/matching';
import { collectStamp } from '@/store/passport';

/** Toggles an agenda id; saving it also turns its reminder on. */
function toggleSaved(s: StoreState, list: string[], kind: 'session' | 'side-event', id: string) {
  const wasSaved = list.includes(id);
  const key = agendaKey(kind, id);
  return { list: toggleIn(list, id), reminders: wasSaved ? s.reminders : addIn(s.reminders, key) };
}

export function useBookmarks() {
  const { state, setState, accountId, accountIdRef } = useStoreValue();
  const bookmarks = state.bookmarks;
  return {
    bookmarked: bookmarks.bookmarked,
    visited: bookmarks.visited,
    mySessions: bookmarks.mySessions,
    mySideEvents: state.mySideEvents,
    toggleBookmark: (placeId: string) =>
      setState((s) => ({
        ...s,
        bookmarks: { ...s.bookmarks, bookmarked: toggleIn(s.bookmarks.bookmarked, placeId) },
      })),
    toggleVisited: (placeId: string) => {
      const wasVisited = bookmarks.visited.includes(placeId);
      setState((s) => ({
        ...s,
        bookmarks: { ...s.bookmarks, visited: toggleIn(s.bookmarks.visited, placeId) },
      }));
      // A first visit collects the place stamp through the same path as every other stamp.
      const targetId = stampTargetId('place', placeId);
      if (accountId && !wasVisited && getStampTarget(targetId)) {
        void collectStamp({ setState, accountIdRef }, targetId);
      }
    },
    toggleSession: (sessionId: string) =>
      setState((s) => {
        const { list: mySessions, reminders } = toggleSaved(s, s.bookmarks.mySessions, 'session', sessionId);
        return { ...s, bookmarks: { ...s.bookmarks, mySessions }, reminders };
      }),
    toggleSideEvent: (sideEventId: string) =>
      setState((s) => {
        const { list: mySideEvents, reminders } = toggleSaved(s, s.mySideEvents, 'side-event', sideEventId);
        return { ...s, mySideEvents, reminders };
      }),
  };
}

export function useLeads() {
  const { state, setState } = useStoreValue();
  return {
    leads: state.leads,
    addLead: (lead: Lead) =>
      setState((s) => ({ ...s, leads: [lead, ...s.leads.filter((l) => l.id !== lead.id)] })),
  };
}

export function useChat(personId: string) {
  const { state, setState } = useStoreValue();
  const { record } = useMatchFeedback();
  return {
    messages: state.chats[personId] ?? [],
    send: (text: string) => {
      const first = (state.chats[personId] ?? []).length === 0;
      setState((s) => ({
        ...s,
        chats: {
          ...s.chats,
          [personId]: [
            ...(s.chats[personId] ?? []),
            { id: nextId('msg'), text, sentAt: new Date().toISOString(), mine: true },
          ],
        },
      }));
      if (first) void record(personId, 'chat_opened');
    },
  };
}

export function useReelReactions() {
  const { state, setState, accountId, sharedLikes, setSharedLikes } = useStoreValue();

  const isLiked = (id: string) => state.reelLikes.includes(id);
  const isSaved = (id: string) => state.reelSaves.includes(id);
  const likeCount = (id: string) => sharedLikes[id] ?? 0;

  const like = (id: string) => {
    const already = isLiked(id);
    setState((s) => (s.reelLikes.includes(id) ? s : { ...s, reelLikes: [...s.reelLikes, id] }));
    if (!already && accountId) {
      void api.reels.like(id).then((count) =>
        setSharedLikes((m) => ({ ...m, [id]: count })),
      );
    }
  };

  const toggleLike = (id: string) => {
    const liked = isLiked(id);
    setState((s) => ({
      ...s,
      reelLikes: toggleIn(s.reelLikes, id),
    }));
    if (accountId) {
      const next = liked ? api.reels.unlike(id) : api.reels.like(id);
      void next.then((count) => setSharedLikes((m) => ({ ...m, [id]: count })));
    }
  };

  const toggleSave = (id: string) => {
    setState((s) => ({ ...s, reelSaves: toggleIn(s.reelSaves, id) }));
  };

  return { isLiked, isSaved, like, toggleLike, toggleSave, likeCount };
}
