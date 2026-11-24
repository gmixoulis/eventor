import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { daySections, nowLocation, type DaySection, type ScheduleRow } from '@/components/meetings/day-sections';
import { reservationTag } from '@/components/live/reserve-state';
import { AgendaCard, MeetingCard, NowDivider } from '@/components/meetings/cards';
import { SlotPicker } from '@/components/meetings/slot-picker';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { itemHref, meetingToItem, type AgendaItem } from '@/lib/agenda-item';
import { eventWallClock } from '@/lib/event-clock';
import { formatFullDay, formatShortDay, formatTime } from '@/lib/format';
import {
  useEventClock,
  useFeatures,
  useMeetings,
  useMyAgenda,
  useOccupiedMeetings,
  useProfile,
  useReservations,
  useSettings,
  type Meeting,
} from '@/store';

export default function MyScheduleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { flags } = useFeatures();
  const { meetings, respond, reschedule, cancel } = useMeetings();
  const occupied = useOccupiedMeetings();
  const { profile } = useProfile();
  const agenda = useMyAgenda();
  const { now } = useEventClock();
  const { statusOf, positionOf } = useReservations();
  const { use24h } = useSettings();
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [rescheduling, setRescheduling] = useState<Meeting | null>(null);
  const listRef = useRef<SectionList<ScheduleRow, DaySection>>(null);

  // The agenda leaves declined meetings out; this screen keeps showing them with their pill.
  const declined = flags.meetings
    ? meetings.filter((m) => m.status === 'declined').map(meetingToItem)
    : [];
  const today = eventWallClock(now).day;
  const sections = daySections([...agenda, ...declined], now.getTime(), today);
  const empty = sections.length === 0;
  const target = nowLocation(sections);

  const scrolled = useRef(false);
  useEffect(() => {
    // Once, on open: later clock ticks or edits must not yank the list back.
    if (scrolled.current || !target) return;
    scrolled.current = true;
    listRef.current?.scrollToLocation({ ...target, viewPosition: 0.3, animated: false });
  }, [target]);

  const when = (item: AgendaItem) =>
    `${formatTime(item.startTime, use24h)} - ${formatTime(item.endTime, use24h)} • ${formatShortDay(item.day)}`;
  const heldTag = (item: AgendaItem) => reservationTag(statusOf(item.key), positionOf(item.key));

  const act = (fn: () => void) => {
    fn();
    setSelected(null);
  };

  const onReschedule = (m: Meeting) => {
    setSelected(null);
    setRescheduling(m);
  };

  const onCancel = (m: Meeting) =>
    Alert.alert('Cancel meeting', `Cancel your meeting with ${m.name}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel meeting', style: 'destructive', onPress: () => act(() => cancel(m.id)) },
    ]);

  const actions = selected
    ? [
        ...(selected.direction === 'inbound' && selected.status === 'pending'
          ? [
              { label: 'Accept', onPress: () => act(() => respond(selected.id, 'accepted')) },
              { label: 'Decline', onPress: () => act(() => respond(selected.id, 'declined')) },
            ]
          : []),
        { label: 'Reschedule', onPress: () => onReschedule(selected) },
        { label: 'Cancel meeting', danger: true, onPress: () => onCancel(selected) },
      ]
    : [];

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Schedule" variant="tab" />
      {empty ? (
        <View style={styles.empty}>
          <EmptyState
            illustrated
            icon="calendar-blank"
            title="Nothing scheduled yet"
            body="Request meetings with people or save sessions to see them here."
          />
          {flags.people ? <Button label="Find people" onPress={() => router.push('/people')} /> : null}
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(row) => (row.kind === 'now' ? 'now' : row.item.key)}
          onScrollToIndexFailed={({ averageItemLength, index }) =>
            listRef.current?.getScrollResponder()?.scrollTo({ y: averageItemLength * index, animated: false })
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.day}>{formatFullDay(section.title)}</Text>
          )}
          renderItem={({ item: row }) => {
            if (row.kind === 'now') return <NowDivider />;
            const item = row.item;
            const [time, period] = formatTime(item.startTime, use24h).split(' ');
            const meeting = item.kind === 'meeting' ? meetings.find((m) => m.id === item.id) : undefined;
            if (item.kind === 'meeting' && !meeting) return null;
            return (
              <View style={styles.row}>
                <View style={styles.timeCol}>
                  <Text style={styles.time}>{time}</Text>
                  {period ? <Text style={styles.period}>{period}</Text> : null}
                </View>
                {meeting ? (
                  <MeetingCard
                    meeting={meeting}
                    when={when(item)}
                    onProfile={flags.people ? () => router.push(`/person/${meeting.personId}`) : undefined}
                    onChat={flags.meetings ? () => router.push(`/chat/${meeting.personId}`) : undefined}
                    onMore={() => setSelected(meeting)}
                  />
                ) : (
                  <AgendaCard
                    kind={item.kind === 'side-event' ? 'Side event' : 'Session'}
                    title={item.title}
                    when={when(item)}
                    place={item.place}
                    heldTag={heldTag(item)}
                    onPress={() => router.push(itemHref(item))}
                  />
                )}
              </View>
            );
          }}
        />
      )}

      <PressableScale onPress={() => router.push('/schedule')} hitSlop={2} accessibilityRole="button" accessibilityLabel="Open the schedule" style={styles.fab}>
        <Text style={styles.fabText}>Schedule</Text>
        <FontAwesome5 name="arrow-right" size={11} color={colors.onPrimary} />
      </PressableScale>

      <Sheet
        visible={selected !== null}
        title={selected ? `Meeting with ${selected.name}` : ''}
        onClose={() => setSelected(null)}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={[styles.actionText, a.danger && styles.danger]}>{a.label}</Text>
          </Pressable>
        ))}
      </Sheet>

      <Sheet
        visible={rescheduling !== null}
        title="Pick a new time"
        onClose={() => setRescheduling(null)}>
        {rescheduling ? (
          <SlotPicker
            me={{
              availability: profile.availability,
              meetings: meetings.filter((x) => x.id !== rescheduling.id),
            }}
            them={{ availability: [], meetings: [] }}
            submitLabel="Reschedule"
            confirmation="Meeting rescheduled"
            occupied={occupied}
            onSubmit={(slot) => {
              if (!reschedule(rescheduling.id, slot.id, { table: slot.table })) return false;
              setRescheduling(null);
              return true;
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  day: {
    ...typeScale.section,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  timeCol: { minWidth: 48 },
  // The hour reads first; the AM/PM marker steps back under it.
  time: { ...typeScale.label, color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
  period: { ...typeScale.caption, color: colors.textMuted, textAlign: 'right' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 40, // the 2 pt hit slop brings the target to 44
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    shadowColor: colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fabText: { ...typeScale.label, color: colors.onPrimary },
  pressed: { opacity: 0.7 },
  action: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionText: { ...typeScale.label, color: colors.text },
  danger: { color: colors.danger },
}));
