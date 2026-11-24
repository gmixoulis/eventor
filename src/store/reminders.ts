import { dueReminders, type Reminder } from '@/lib/reminders';
import { addIn, toggleIn } from '@/lib/utils';
import { useMyAgenda } from '@/store/agenda';
import { useStoreValue } from '@/store/context';
import { useEventClock } from '@/store/event-clock';

export function useReminders(): {
  has: (key: string) => boolean;
  toggle: (key: string) => void;
  due: Reminder[];
  dismiss: (key: string) => void;
} {
  const { state, setState } = useStoreValue();
  const items = useMyAgenda();
  const { now } = useEventClock();

  const due = dueReminders(items, state.reminders, state.dismissedReminders, now);

  return {
    has: (key: string) => state.reminders.includes(key),
    toggle: (key: string) => setState((s) => ({ ...s, reminders: toggleIn(s.reminders, key) })),
    due,
    dismiss: (key: string) =>
      setState((s) => ({ ...s, dismissedReminders: addIn(s.dismissedReminders, key) })),
  };
}
