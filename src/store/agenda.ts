import { getSession, getSideEvent } from '@/data';
import {
  byStart,
  meetingToItem,
  sessionToItem,
  sideEventToItem,
  withoutDisabledFeatures,
  type AgendaItem,
} from '@/lib/agenda-item';
import { useStoreValue } from '@/store/context';
import { useFeatures } from '@/store/session';

/** The account's meetings (not declined), saved sessions and saved side events, by start. */
export function useMyAgenda(): AgendaItem[] {
  const { state } = useStoreValue();
  const { flags } = useFeatures();
  const meetings = state.meetings
    .filter((meeting) => meeting.status !== 'declined')
    .map(meetingToItem);
  const sessions = state.bookmarks.mySessions.flatMap((id) => {
    const session = getSession(id);
    return session ? [sessionToItem(session)] : [];
  });
  const sideEvents = state.mySideEvents.flatMap((id) => {
    const event = getSideEvent(id);
    return event ? [sideEventToItem(event)] : [];
  });
  return withoutDisabledFeatures([...meetings, ...sessions, ...sideEvents], flags).sort(byStart);
}
