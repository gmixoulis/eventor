import type { ActivityItem } from '@/backend/types';
import { useStoreValue } from '@/store/context';
import { nextId } from '@/store/ids';

export function useActivity() {
  const { state, setState } = useStoreValue();
  return {
    items: state.activity,
    add: (item: { kind: ActivityItem['kind']; title: string; body: string; date?: string }) =>
      setState((s) => ({
        ...s,
        activity: [
          {
            id: nextId('act'),
            kind: item.kind,
            title: item.title,
            body: item.body,
            date: item.date ?? new Date().toISOString(),
          },
          ...s.activity,
        ],
      })),
  };
}

export function useAnnouncements(): { read: string[]; markRead(id: string): void } {
  const { state, setState, accountId } = useStoreValue();
  return {
    read: state.readAnnouncements,
    // Reading an announcement is not a signed-in action; for a guest it stays unread.
    markRead: (id: string) => {
      if (!accountId) return;
      setState((s) =>
        s.readAnnouncements.includes(id)
          ? s
          : { ...s, readAnnouncements: [...s.readAnnouncements, id] },
      );
    },
  };
}
