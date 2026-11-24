import { useEffect, useRef } from 'react';
import {
  SectionList,
  StyleSheet,
  View,
  type SectionListData,
  type SectionListRenderItem,
} from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { reservationTag } from '@/components/live/reserve-state';
import { agendaOverlapLabel } from '@/components/live/overlap';
import { useLiveStatus } from '@/components/live/use-live-status';
import { groupByTime } from '@/components/schedule/agenda-math';
import { AgendaSectionHeader, AllDayRow, JumpToNowButton } from '@/components/schedule/agenda-rows';
import { stageColor } from '@/components/schedule/math';
import { SessionCard } from '@/components/schedule/session-card';
import { currentMergedIndex, mergeSideEvents, type MergedRow } from '@/components/side-events/agenda-merge';
import { AgendaSideEventCard } from '@/components/side-events/agenda-side-event-card';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing } from '@/constants/theme';
import { getSpeaker, listStages, listTags, listTracks, type SideEvent } from '@/data';
import type { Session } from '@/data/types';
import { sessionToItem, sideEventToItem, type AgendaItem } from '@/lib/agenda-item';
import { formatTime, toMinutes } from '@/lib/format';
import { useFollows, useMyAgenda, useReservations } from '@/store';

type AgendaSection = {
  title: string;
  data: MergedRow[];
  allDay?: boolean;
  current?: 'now' | 'next';
};

type Props = {
  dayId: string;
  sessions: Session[];
  /** That day's side events to show among the sessions; empty when the chip is off. */
  sideEvents: SideEvent[];
  mySessionIds: string[];
  use24h: boolean;
  isToday: boolean;
  nowMinutes: number | null;
  hasFilters: boolean;
  onToggleSession: (id: string) => void;
  onPressSession: (id: string) => void;
  onPressSideEvent: (id: string) => void;
  onOpenSideEvent: (url: string) => void;
  onClearFilters: () => void;
};

export function Agenda({
  dayId,
  sessions,
  sideEvents,
  mySessionIds,
  use24h,
  isToday,
  nowMinutes,
  hasFilters,
  onToggleSession,
  onPressSession,
  onPressSideEvent,
  onOpenSideEvent,
  onClearFilters,
}: Props) {
  const styles = useStyles();
  const { scheme } = useTheme();
  const agenda = useMyAgenda();
  const listRef = useRef<SectionList<MergedRow, AgendaSection>>(null);
  const lastScrollKey = useRef<string | null>(null);
  const statusFor = useLiveStatus();
  const { statusOf, positionOf } = useReservations();
  const { sessionIds: followedIds } = useFollows();
  const heldTag = (item: AgendaItem) => reservationTag(statusOf(item.key), positionOf(item.key));

  const grouped = groupByTime(sessions);
  const allDay = grouped.allDay;
  const sections = mergeSideEvents(grouped.sections, sideEvents);
  const currentIndex = nowMinutes === null ? -1 : currentMergedIndex(sections, nowMinutes);
  const hasCurrent = currentIndex >= 0 && currentIndex < sections.length;

  const scrollToCurrent = (animated: boolean) => {
    if (!hasCurrent) return;
    listRef.current?.scrollToLocation({
      sectionIndex: (allDay.length ? 1 : 0) + currentIndex,
      itemIndex: 0,
      viewPosition: 0,
      animated,
    });
  };

  useEffect(() => {
    if (!isToday || !hasCurrent) return;
    const key = `${dayId}:${currentIndex}`;
    if (lastScrollKey.current === key) return;
    lastScrollKey.current = key;
    scrollToCurrent(false);
  });

  if (sessions.length === 0 && sideEvents.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState icon="calendar-blank" title="No sessions match" />
        {hasFilters ? (
          <Button label="Clear filters" onPress={onClearFilters} variant="outline" />
        ) : null}
      </View>
    );
  }

  const listSections: SectionListData<MergedRow, AgendaSection>[] = [];
  if (allDay.length) {
    listSections.push({
      title: 'All day',
      data: allDay.map((session): MergedRow => ({ kind: 'session', session })),
      allDay: true,
    });
  }
  sections.forEach((section, i) => {
    const started = nowMinutes !== null && nowMinutes >= toMinutes(section.startTime);
    listSections.push({
      title: formatTime(section.startTime, use24h),
      data: section.rows,
      current: i === currentIndex ? (started ? 'now' : 'next') : undefined,
    });
  });

  const stageName = (id: string): string => listStages().find((s) => s.id === id)?.name ?? '';
  const stageOrder = (id: string): number => listStages().find((s) => s.id === id)?.order ?? 4;
  const trackName = (id: string): string | undefined => listTracks().find((t) => t.id === id)?.name;
  const tagName = (id: string): string | undefined => listTags().find((t) => t.id === id)?.name;

  const renderItem: SectionListRenderItem<MergedRow, AgendaSection> = ({ item: row, section }) => {
    if (row.kind === 'side-event') {
      const sideItem = sideEventToItem(row.event);
      return (
        <AgendaSideEventCard
          event={row.event}
          status={statusFor(sideItem)}
          heldTag={heldTag(sideItem)}
          use24h={use24h}
          onPress={() => onPressSideEvent(row.event.id)}
        />
      );
    }
    const item = row.session;
    const url = item.url;
    if (section.allDay) {
      const onPress = url ? () => onOpenSideEvent(url) : () => onPressSession(item.id);
      return <AllDayRow title={item.title} external={url !== undefined} onPress={onPress} />;
    }

    const sessionItem = sessionToItem(item);
    const speakers = item.speakerIds
      .map(getSpeaker)
      .filter((s) => s !== undefined)
      .map((s) => ({ name: s.name, photo: s.photo }));

    return (
      <SessionCard
        session={item}
        stageName={stageName(item.stageId)}
        stageBorder={stageColor(stageOrder(item.stageId), scheme).border}
        trackName={trackName(item.trackId)}
        tagNames={item.tagIds.map(tagName).filter((n) => n !== undefined)}
        speakers={speakers}
        inAgenda={mySessionIds.includes(item.id)}
        overlapLabel={agendaOverlapLabel(sessionItem, agenda, use24h)}
        status={statusFor(sessionItem)}
        heldTag={heldTag(sessionItem)}
        following={followedIds.includes(item.id)}
        use24h={use24h}
        onToggle={() => onToggleSession(item.id)}
        onPress={() => onPressSession(item.id)}
      />
    );
  };

  const renderHeader = ({ section }: { section: SectionListData<MergedRow, AgendaSection> }) => (
    <AgendaSectionHeader
      title={section.title}
      count={section.data.length}
      current={section.current}
      noun={section.data.some((r) => r.kind === 'side-event') ? 'item' : 'session'}
    />
  );

  const showJump = isToday && currentIndex > 0 && hasCurrent;

  return (
    <View style={styles.container}>
      <SectionList
        ref={listRef}
        sections={listSections}
        keyExtractor={(row) => (row.kind === 'session' ? row.session.id : `side-event:${row.event.id}`)}
        renderItem={renderItem}
        renderSectionHeader={renderHeader}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={styles.list}
      />
      {showJump ? <JumpToNowButton onPress={() => scrollToCurrent(true)} /> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xxl,
    gap: spacing.md,
  },
}));
