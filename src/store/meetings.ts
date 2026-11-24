import { useEffect, useState } from 'react';

import { api } from '@/backend/api';
import type { ActivityItem, Meeting } from '@/backend/types';
import { getPerson, slotPlace } from '@/data';
import type { Person } from '@/data/types';
import { agendaKey } from '@/lib/agenda-item';
import { useStoreValue } from '@/store/context';
import { nextId } from '@/store/ids';
import { useMatchFeedback } from '@/store/matching';

function buildMeeting(
  person: Person,
  start: string,
  place: string,
  status: Meeting['status'],
  direction: Meeting['direction'],
  extra?: { slotId?: string; table?: number; note?: string; suggestedBy?: 'organizer' },
): Meeting {
  return {
    id: nextId('m'),
    createdAt: new Date().toISOString(),
    personId: person.id,
    name: person.name,
    company: person.company,
    title: person.title,
    role: person.role,
    start,
    duration: 15,
    place,
    status,
    direction,
    ...extra,
  };
}

type MeetingAction = 'accepted' | 'declined' | 'rescheduled' | 'cancelled' | 'requested';

function meetingTitle(meeting: Meeting, action: MeetingAction): string {
  const { name } = meeting;
  const byMe = meeting.direction === 'inbound';
  switch (action) {
    case 'accepted':
      return byMe ? `You accepted ${name}'s meeting request` : `${name} accepted your meeting request`;
    case 'declined':
      return byMe ? `You declined ${name}'s request` : `${name} declined your request`;
    case 'rescheduled':
      return `You rescheduled your meeting with ${name}`;
    case 'cancelled':
      return `You cancelled your meeting with ${name}`;
    case 'requested':
      return `You sent ${name} a meeting request`;
  }
}

/** The meeting time and place are stored raw and formatted at render time (12 or 24 hour). */
export function meetingActivity(meeting: Meeting | undefined, action: MeetingAction): ActivityItem {
  return {
    id: nextId('act'),
    kind: 'meeting',
    title: meeting ? meetingTitle(meeting, action) : `Meeting ${action}`,
    body: '',
    ...(meeting ? { meetingStart: meeting.start, place: meeting.place } : {}),
    date: new Date().toISOString(),
  };
}

/** The meeting after a move; the activity entry must be built from this same object. */
export function rescheduled(meeting: Meeting, start: string, slot?: { table: number }): Meeting {
  return {
    ...meeting,
    start,
    ...(slot ? { slotId: start, table: slot.table, place: slotPlace(slot.table) } : {}),
  };
}

export function useMeetings() {
  const { state, setState, accountId } = useStoreValue();
  const { record } = useMatchFeedback();
  return {
    meetings: state.meetings,
    respond: (id: string, response: 'accepted' | 'declined') => {
      const meeting = state.meetings.find((m) => m.id === id);
      setState((s) => {
        const target = s.meetings.find((m) => m.id === id);
        return {
          ...s,
          meetings: s.meetings.map((m) => (m.id === id ? { ...m, status: response } : m)),
          activity: [meetingActivity(target, response), ...s.activity],
        };
      });
      if (meeting) {
        void record(meeting.personId, response === 'accepted' ? 'request_accepted' : 'request_declined');
      }
    },
    /** Returns whether the meeting was rescheduled. */
    reschedule: (id: string, start: string, slot?: { table: number }): boolean => {
      if (!accountId || !state.meetings.some((m) => m.id === id)) return false;
      setState((s) => {
        const meeting = s.meetings.find((m) => m.id === id);
        const moved = meeting && rescheduled(meeting, start, slot);
        return {
          ...s,
          meetings: s.meetings.map((m) => (m.id === id && moved ? moved : m)),
          activity: [meetingActivity(moved, 'rescheduled'), ...s.activity],
        };
      });
      return true;
    },
    cancel: (id: string) =>
      setState((s) => {
        const meeting = s.meetings.find((m) => m.id === id);
        return {
          ...s,
          meetings: s.meetings.filter((m) => m.id !== id),
          activity: [meetingActivity(meeting, 'cancelled'), ...s.activity],
        };
      }),
    /** Returns whether the request was written (false for a guest or an unknown person). */
    request: (personId: string, slot: { id: string; table: number }, note?: string): boolean => {
      const person = getPerson(personId);
      if (!person) return false;
      const meeting = buildMeeting(person, slot.id, slotPlace(slot.table), 'pending', 'outbound', {
        slotId: slot.id,
        table: slot.table,
        note,
      });
      setState((s) => ({
        ...s,
        meetings: [meeting, ...s.meetings],
        reminders: [...s.reminders, agendaKey('meeting', meeting.id)],
        activity: [meetingActivity(meeting, 'requested'), ...s.activity],
      }));
      if (!accountId) return false; // the guest setState above opened sign-in instead
      void api.meetings.create(accountId, meeting);
      void record(personId, 'request_sent');
      return true;
    },
  };
}

/** Meetings booked by every other demo account, for table assignment in the slot picker. */
export function useOccupiedMeetings(): Meeting[] {
  const { accountId } = useStoreValue();
  const [occupied, setOccupied] = useState<Meeting[]>([]);
  useEffect(() => {
    let cancelled = false;
    api.meetings
      .allForTables(accountId)
      .then((list) => {
        if (!cancelled) setOccupied(list);
      })
      .catch(() => {
        // In-memory read; on failure the picker still avoids this account's own tables.
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);
  return occupied;
}

export function useOrganizer() {
  const { setState, accountId } = useStoreValue();
  return {
    /** Returns whether the suggestion was written. */
    suggestMeeting: (personId: string, slot: { id: string; table: number }, note?: string): boolean => {
      const person = getPerson(personId);
      if (!person || !accountId) return false;
      const meeting = buildMeeting(person, slot.id, slotPlace(slot.table), 'pending', 'inbound', {
        slotId: slot.id,
        table: slot.table,
        note,
        suggestedBy: 'organizer',
      });
      const activity = {
        ...meetingActivity(meeting, 'requested'),
        title: `An organizer suggested a meeting with ${person.name}`,
      };
      setState((s) => ({
        ...s,
        meetings: [meeting, ...s.meetings],
        reminders: [...s.reminders, agendaKey('meeting', meeting.id)],
        activity: [activity, ...s.activity],
      }));
      void api.organizer.suggestMeeting(accountId, meeting);
      return true;
    },
  };
}
