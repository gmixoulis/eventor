import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { eventTomorrow, isAllDayItem } from '@/components/home/helpers';
import { HomeSection, useHomeStyles } from '@/components/home/section';
import { StatusPill } from '@/components/live/status-pill';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles } from '@/components/theme';
import { typeScale } from '@/constants/theme';
import { listSideEvents } from '@/data';
import { byStart, itemHref, itemStartMs, sideEventToItem } from '@/lib/agenda-item';
import { eventWallClock } from '@/lib/event-clock';
import { formatShortDay, formatTime } from '@/lib/format';
import { liveStatus } from '@/lib/live-status';
import { useEventClock, useReservations, useSettings } from '@/store';

export function SideEventsSection() {
  const styles = useHomeStyles();
  const local = useStyles();
  const { now } = useEventClock();
  const { counts } = useReservations();
  const { use24h } = useSettings();
  const days = [eventWallClock(now).day, eventTomorrow(now)];
  const events = days.flatMap((day) => listSideEvents({ day }))
    .map((event) => ({ event, item: sideEventToItem(event) }))
    .filter(({ item }) => itemStartMs(item) > now.getTime() && !isAllDayItem(item))
    .sort((a, b) => byStart(a.item, b.item)).slice(0, 6);
  if (!events.length) return null;
  return <HomeSection title="Side events tonight and tomorrow" href="/side-events">
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {events.map(({ event, item }) => <PressableScale key={item.key} style={[styles.card, local.card]}
        accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => router.push(itemHref(item))}>
        <Text style={local.when}>{formatShortDay(item.day)} · {formatTime(item.startTime, use24h)}</Text>
        <Text style={[styles.label, local.title]} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.caption} numberOfLines={1}>{event.category} · {event.area}</Text>
        <StatusPill compact status={liveStatus(item, now, counts[item.key] ?? 0)} />
      </PressableScale>)}
    </ScrollView>
  </HomeSection>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: { width: 200, alignSelf: 'stretch' },
  // Time leads each card so the row scans by when.
  when: { ...typeScale.label, color: colors.text, fontVariant: ['tabular-nums'] },
  title: { flexGrow: 1 },
}));
