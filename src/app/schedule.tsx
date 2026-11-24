import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { EmptyState } from '@/components/empty-state';
import { Agenda } from '@/components/schedule/agenda';
import { eventWallClock } from '@/lib/event-clock';
import { DayPicker } from '@/components/schedule/day-picker';
import { DisplaySheet, type ScheduleView } from '@/components/schedule/display-sheet';
import { FilterChips, type FilterKind } from '@/components/schedule/filter-chips';
import { FilterSheet } from '@/components/schedule/filter-sheet';
import { IconButton } from '@/components/schedule/icon-button';
import { Timeline } from '@/components/schedule/timeline';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getEvent, getSpeaker, listSessions, listSideEvents, listSpeakers, listStages, listTags, listTracks } from '@/data';
import { toMinutes } from '@/lib/format';
import { useBookmarks, useEventClock, useFeatures, useSettings } from '@/store';

const days = getEvent().days;

export default function ScheduleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  // The map's "Today's talks" deep-links here with a day and hall already chosen.
  const params = useLocalSearchParams<{ day?: string; stage?: string }>();
  const [dayId, setDayId] = useState(typeof params.day === 'string' && days.includes(params.day) ? params.day : days[0]);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [speakerIds, setSpeakerIds] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);
  const [sheet, setSheet] = useState<FilterKind | null>(null);
  const [compactOpen, setCompactOpen] = useState(false);
  const [stageId, setStageId] = useState<string | null>(
    typeof params.stage === 'string' && listStages().some((st) => st.id === params.stage) ? params.stage : null);
  const [myAgenda, setMyAgenda] = useState(false);
  const [showSideEvents, setShowSideEvents] = useState(false);
  const [view, setView] = useState<ScheduleView>('agenda');

  const { use24h } = useSettings();
  const { flags } = useFeatures();
  const { mySessions, mySideEvents, toggleSession } = useBookmarks();
  const { now } = useEventClock();
  // A switch turned off while this screen stays open drops the side events it was showing.
  const withSideEvents = showSideEvents && flags.sideEvents;

  // The search matches titles and speaker names (the shared listSessions query matches descriptions).
  const q = query.trim().toLowerCase();
  const filtered = listSessions({ day: dayId, trackIds, tagIds, speakerIds }).filter(
    (s) =>
      (!stageId || s.stageId === stageId) &&
      (!myAgenda || mySessions.includes(s.id)) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        s.speakerIds.some((id) => (getSpeaker(id)?.name ?? '').toLowerCase().includes(q))),
  );

  const sideEvents = withSideEvents
    ? listSideEvents({ day: dayId, ...(q ? { query: q } : {}) }).filter((e) => !myAgenda || mySideEvents.includes(e.id))
    : [];

  const activeCount = trackIds.length + tagIds.length + speakerIds.length;
  const hasAnyFilter = activeCount > 0 || stageId !== null || myAgenda || withSideEvents;

  const daySessions = listSessions({ day: dayId });
  const stageOptions = listStages()
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((st) => daySessions.some((s) => s.stageId === st.id));


  const wall = eventWallClock(now);
  const isToday = wall.day === dayId;
  const nowMinutes = isToday ? toMinutes(wall.time) : null;

  const clearFilters = () => {
    setTrackIds([]);
    setTagIds([]);
    setSpeakerIds([]);
    setStageId(null);
    setMyAgenda(false);
    setShowSideEvents(false);
  };

  const openSideEvent = (url: string) => {
    void WebBrowser.openBrowserAsync(url);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Schedule" variant="stack" />

      <DayPicker days={days} dayId={dayId} onSelect={setDayId} actions={<>
        <IconButton icon="search" label="Search sessions" onPress={() => setShowSearch((v) => !v)} />
        <IconButton icon="filter" label="Filter by track" onPress={() => setSheet('tracks')} badge={activeCount} />
        <IconButton icon="sliders-h" label="Display options" onPress={() => setCompactOpen(true)} />
      </>} />

      {showSearch ? (
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search sessions or speakers"
            placeholderTextColor={colors.textMuted} cursorColor={colors.primary} selectionColor={colors.primary}
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>
      ) : null}

      <FilterChips stageOptions={stageOptions} stageId={stageId} onStage={setStageId} myAgenda={myAgenda}
        onToggleMyAgenda={() => setMyAgenda((v) => !v)}
        sideEvents={withSideEvents} onToggleSideEvents={flags.sideEvents ? () => setShowSideEvents((v) => !v) : undefined}
        counts={{ tracks: trackIds.length, tags: tagIds.length, speakers: speakerIds.length }}
        onOpenSheet={setSheet} hasAnyFilter={hasAnyFilter} onClear={clearFilters} />

      {view === 'agenda' ? (
        <Agenda
          dayId={dayId}
          sessions={filtered}
          sideEvents={sideEvents}
          mySessionIds={mySessions}
          use24h={use24h}
          isToday={isToday}
          nowMinutes={nowMinutes}
          hasFilters={hasAnyFilter}
          onToggleSession={toggleSession}
          onPressSession={(id) => router.push(`/session/${id}`)}
          onPressSideEvent={(id) => router.push(`/side-event/${id}`)}
          onOpenSideEvent={openSideEvent}
          onClearFilters={clearFilters}
        />
      ) : (
        <Animated.View key={dayId} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.timeline}>
          {filtered.length ? (
            <Timeline
              sessions={filtered}
              mySessionIds={mySessions}
              compact={compact}
              use24h={use24h}
              onPressSession={(id) => router.push(`/session/${id}`)}
              onOpenSideEvent={openSideEvent}
            />
          ) : (
            <EmptyState icon="calendar-blank" title="No sessions match" />
          )}
        </Animated.View>
      )}

      <FilterSheet
        visible={sheet === 'tracks'}
        title="Select tracks"
        options={listTracks().map((t) => ({ id: t.id, name: t.name }))}
        selected={trackIds}
        onClose={() => setSheet(null)}
        onDone={setTrackIds}
      />
      <FilterSheet
        visible={sheet === 'tags'}
        title="Select tags"
        options={listTags().map((t) => ({ id: t.id, name: t.name }))}
        selected={tagIds}
        onClose={() => setSheet(null)}
        onDone={setTagIds}
      />
      <FilterSheet
        visible={sheet === 'speakers'}
        title="Select speakers"
        options={listSpeakers().map((s) => ({ id: s.id, name: s.name }))}
        selected={speakerIds}
        onClose={() => setSheet(null)}
        onDone={setSpeakerIds}
      />

      <DisplaySheet visible={compactOpen} onClose={() => setCompactOpen(false)} view={view} onViewChange={setView}
        compact={compact} onCompactChange={setCompact} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typeScale.body,
    color: colors.text,
  },
  timeline: {
    flex: 1,
  },
}));
