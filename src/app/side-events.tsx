import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { useLiveStatus } from '@/components/live/use-live-status';
import { ScreenHeader } from '@/components/screen-header';
import { HubFilterBar } from '@/components/side-events/hub-filters';
import { applyHubFilters, groupByDay, NO_FILTERS, type HubFilters } from '@/components/side-events/hub-math';
import { SideEventCard } from '@/components/side-events/side-event-card';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { SideEvent } from '@/data';
import { itemHref, sideEventToItem } from '@/lib/agenda-item';
import { formatFullDay } from '@/lib/format';
import { useBookmarks, useSettings } from '@/store';

export default function SideEventsScreen() {
  const styles = useStyles();
  const [filters, setFilters] = useState<HubFilters>(NO_FILTERS);
  const statusFor = useLiveStatus();
  const { mySideEvents, toggleSideEvent } = useBookmarks();
  const { use24h } = useSettings();

  const status = (event: SideEvent) => statusFor(sideEventToItem(event));
  const sections = groupByDay(applyHubFilters(filters, (event) => status(event).level === 'full'));
  const clear = () => setFilters(NO_FILTERS);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Side events" variant="stack" />
      <SectionList
        sections={sections}
        keyExtractor={(event) => event.id}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <HubFilterBar filters={filters} onChange={setFilters} onClear={clear} />
        }
        ListEmptyComponent={
          <EmptyState
            illustrated
            icon="calendar-blank"
            title="No side events match"
            body="Try another day or category."
            action={{ label: 'Clear filters', onPress: clear }}
          />
        }
        renderSectionHeader={({ section }) => <Text style={styles.day}>{formatFullDay(section.title)}</Text>}
        renderItem={({ item: event }) => (
          <SideEventCard
            event={event}
            status={status(event)}
            saved={mySideEvents.includes(event.id)}
            use24h={use24h}
            onToggle={() => toggleSideEvent(event.id)}
            onPress={() => router.push(itemHref(sideEventToItem(event)))}
          />
        )}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: spacing.xl },
    day: { ...typeScale.section, color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  }),
);
