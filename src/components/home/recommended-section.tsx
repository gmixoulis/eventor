import { Text } from 'react-native';

import { MeanderLoader } from '@/components/art/meander-line';
import { withoutAllDay } from '@/components/home/helpers';
import { HomeList, HomeRow, HomeSection, useHomeStyles } from '@/components/home/section';
import { formatShortDay, formatTime } from '@/lib/format';
import { useAgendaRecs, useSettings } from '@/store';

const SHOWN = 4;

export function RecommendedSection() {
  const styles = useHomeStyles();
  // Ask for a few spare rows so dropping all-day blocks still leaves four.
  const { recs: ranked, ready } = useAgendaRecs(SHOWN + 3);
  const { use24h } = useSettings();
  const keep = new Set(withoutAllDay(ranked.map((rec) => rec.item)));
  const recs = ranked.filter((rec) => keep.has(rec.item)).slice(0, SHOWN);
  if (ready && !recs.length) return null;
  return (
    <HomeSection title="Recommended for you" href="/schedule">
      {!ready ? <MeanderLoader width={160} accessibilityLabel="Loading recommendations" />
        : <HomeList>{recs.map(({ item, reason }, index) => <HomeRow key={item.key} item={item} first={index === 0}>
          <Text style={styles.caption}>{formatShortDay(item.day)} · {formatTime(item.startTime, use24h)}</Text>
          {reason ? <Text style={styles.caption}>{reason}</Text> : null}
        </HomeRow>)}</HomeList>}
    </HomeSection>
  );
}
