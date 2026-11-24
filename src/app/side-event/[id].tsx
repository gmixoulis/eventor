import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LiveActions, LiveSummary } from '@/components/live/live-panel';
import { useLiveStatus } from '@/components/live/use-live-status';
import { StampCheckIn } from '@/components/passport/stamp-check-in';
import { ScreenHeader } from '@/components/screen-header';
import { PlaceLinks } from '@/components/side-events/detail-actions';
import { RequestPlace } from '@/components/side-events/request-place';
import { walkText } from '@/components/side-events/hub-math';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getInterest, getSideEvent, stampTargetId } from '@/data';
import { sideEventToItem } from '@/lib/agenda-item';
import { formatFullDay, formatTime } from '@/lib/format';
import { useBookmarks, useFeatures, useSettings } from '@/store';

export default function SideEventScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { use24h } = useSettings();
  const { flags } = useFeatures();
  const { mySideEvents, toggleSideEvent } = useBookmarks();
  const statusFor = useLiveStatus();
  const event = getSideEvent(id);

  if (!event) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Side event" variant="stack" />
        <View style={styles.missing}>
          <EmptyState icon="calendar-blank" title="Side event not found" />
        </View>
      </View>
    );
  }

  const item = sideEventToItem(event);
  const live = statusFor(item).phase === 'live';
  const topics = [event.category, ...event.interestIds.map((id) => getInterest(id)?.name)].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <ScreenHeader title="Side event" variant="stack" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.host}>Hosted by {event.host}</Text>
        {topics ? <Text style={styles.topics}>{topics}</Text> : null}

        <View style={styles.metaRow}>
          <FontAwesome5 name="clock" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatFullDay(event.day)} {'•'} {formatTime(event.startTime, use24h)} - {formatTime(event.endTime, use24h)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <FontAwesome5 name="map-marker-alt" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {event.venueName}, {event.area} {'•'} {walkText(event.lat, event.lng)}
          </Text>
        </View>

        <LiveSummary item={item} />
        <Text style={styles.description}>{event.description}</Text>

        <PlaceLinks event={event} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <LiveActions item={item} inAgenda={mySideEvents.includes(event.id)} onToggle={() => toggleSideEvent(event.id)}
          lead={live && flags.passport ? <StampCheckIn targetId={stampTargetId('side-event', event.id)} /> : undefined}
          request={flags.sideEventRequests ? <RequestPlace event={event} secondary={live && flags.passport} /> : undefined} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.card },
    missing: { flex: 1, justifyContent: 'center' },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.md },
    topics: { ...typeScale.caption, color: colors.textMuted },
    title: { ...typeScale.title, color: colors.text },
    host: { ...typeScale.body, color: colors.textMuted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    metaText: { ...typeScale.body, color: colors.textMuted, flex: 1 },
    description: { ...typeScale.body, color: colors.text },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
  }),
);
