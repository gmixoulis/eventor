import { Text } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { withoutAllDay } from '@/components/home/helpers';
import { HomeList, HomeRow, HomeSection, useHomeStyles } from '@/components/home/section';
import { StatusPill } from '@/components/live/status-pill';
import { listSessions, listSideEvents } from '@/data';
import { byStart, itemStartMs, sessionToItem, sideEventToItem } from '@/lib/agenda-item';
import { eventWallClock } from '@/lib/event-clock';
import { formatTime } from '@/lib/format';
import { timingLabel } from '@/lib/live-status';
import { nearNow } from '@/lib/near-now';
import { useEventClock, useReservations, useSettings } from '@/store';

export function NearNowSection() {
  const styles = useHomeStyles();
  const { now } = useEventClock();
  const { use24h } = useSettings();
  const { counts } = useReservations();
  const day = eventWallClock(now).day;
  // All-day placeholder blocks are not something happening near you; nearNow itself is unchanged.
  const sessions = withoutAllDay(listSessions({ day }).map(sessionToItem));
  const sideEvents = withoutAllDay(listSideEvents({ day }).map(sideEventToItem));
  const rows = nearNow({ sessions, sideEvents, now, origin: null, reservedCounts: counts }).slice(0, 4);
  const next = [...sessions, ...sideEvents].filter((item) => itemStartMs(item) > now.getTime()).sort(byStart)[0];
  return (
    <HomeSection title="Happening near you now" href="/schedule">
      {rows.length ? <HomeList>
        {rows.map(({ item, status, walkMinutes }, index) => <HomeRow key={item.key} item={item}
          first={index === 0} aside={<StatusPill status={status} compact />}>
          <Text style={styles.caption}>{timingLabel(item, now)}
            {walkMinutes === null ? '' : ` · ${walkMinutes} min walk`}</Text>
        </HomeRow>)}
      </HomeList> : <EmptyState illustrated icon="clock-outline" title="Nothing starting in the next 30 minutes"
        body={next ? `Next today at ${formatTime(next.startTime, use24h)}` : 'No more starts today'} />}
    </HomeSection>
  );
}
