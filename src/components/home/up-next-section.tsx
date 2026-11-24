import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { planUpNext, timeUntil, withoutAllDay } from '@/components/home/helpers';
import { HomeList, HomeRow, HomeSection } from '@/components/home/section';
import { Pill } from '@/components/pill';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { itemEndMs, itemHref, type AgendaItem } from '@/lib/agenda-item';
import { formatDuration, formatTime } from '@/lib/format';
import { useEventClock, useFeatures, useMyAgenda, useReservations, useSettings } from '@/store';

/**
 * "Now" (the saved item that is on, with Open and Directions) and "Next for you" (a short timeline).
 * With nothing on, the next item takes the block under "Next for you" and the timeline follows it.
 */
export function UpNextSection() {
  const styles = useStyles();
  const { now } = useEventClock();
  const { use24h } = useSettings();
  const { statusOf } = useReservations();
  const { flags } = useFeatures();
  const items = useMyAgenda();
  const agenda = withoutAllDay(items);
  const { now: current, next, following: timeline } = planUpNext(items, now);
  const lead = current ?? next;
  const seeAll = flags.mySchedule ? '/my-schedule' : undefined;

  const block = (item: AgendaItem) => (
    <View style={styles.block}>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(item.startTime, use24h)}</Text>
        <Text style={styles.relative}>{current
          ? `ends in ${formatDuration(Math.max(1, Math.ceil((itemEndMs(item) - now.getTime()) / 60000)))}`
          : timeUntil(item, now, use24h)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.place} numberOfLines={1}>{item.place}</Text>
      {statusOf(item.key) === 'waitlist' ? <Pill tone="warning" label="On the waitlist" /> : null}
      <View style={styles.actions}>
        <Button label="Open" accessibilityLabel={`Open ${item.title}`} variant="outline" onPress={() => router.push(itemHref(item))} />
        {flags.map ? <Button label="Directions" accessibilityLabel={`Directions to ${item.place}`} variant="outline" onPress={() => router.push('/map')} /> : null}
      </View>
    </View>
  );

  const rows = timeline.length ? <HomeList>
    {timeline.map((row, index) => <HomeRow key={row.key} item={row} first={index === 0}
      lead={<Text style={styles.when}>{formatTime(row.startTime, use24h)}</Text>} />)}
  </HomeList> : null;

  if (!lead) {
    return <HomeSection title="Next for you" href={seeAll}>
      <EmptyState illustrated icon="calendar-blank-outline" title={agenda.length ? 'Your agenda is complete' : 'Nothing saved yet'}
        action={{ label: 'Browse the schedule', onPress: () => router.push('/schedule') }} />
    </HomeSection>;
  }
  return current ? <>
    <HomeSection title="Now">{block(current)}</HomeSection>
    {rows ? <HomeSection title="Next for you" href={seeAll}>{rows}</HomeSection> : null}
  </> : <HomeSection title="Next for you" href={seeAll}>{block(lead)}{rows}</HomeSection>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  // The one coloured block on Home: pink from the welcome art, black text in both themes.
  block: { backgroundColor: colors.artPink, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.md },
  time: { ...typeScale.title, fontSize: 40, lineHeight: 46, letterSpacing: -0.8, color: colors.onArt, fontVariant: ['tabular-nums'] },
  relative: { ...typeScale.label, color: colors.onArt },
  title: { ...typeScale.header, color: colors.onArt, marginTop: spacing.xs },
  place: { ...typeScale.body, color: colors.onArt },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  when: { ...typeScale.label, minWidth: 72, color: colors.text, fontVariant: ['tabular-nums'] },
}));
