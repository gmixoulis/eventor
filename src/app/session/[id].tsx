import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { LiveActions, LiveSummary } from '@/components/live/live-panel';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getSession, getSpeaker, listStages, listTags, listTracks } from '@/data';
import { sessionToItem } from '@/lib/agenda-item';
import { formatFullDay, formatTime } from '@/lib/format';
import { useBookmarks, useFeatures, useSettings } from '@/store';

export default function SessionScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { use24h } = useSettings();
  const { mySessions, toggleSession } = useBookmarks();
  const { flags } = useFeatures();

  const session = getSession(id);

  if (!session) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Session" variant="stack" />
        <View style={styles.missing}>
          <EmptyState icon="calendar-blank" title="Session not found" />
        </View>
      </View>
    );
  }

  const track = listTracks().find((t) => t.id === session.trackId);
  const stage = listStages().find((s) => s.id === session.stageId);
  const topics = [track?.name, ...session.tagIds.map((tagId) => listTags().find((t) => t.id === tagId)?.name)]
    .filter(Boolean)
    .join(' · ');
  const speakers = session.speakerIds
    .map((speakerId) => getSpeaker(speakerId))
    .filter((s) => s !== undefined);

  const inSchedule = mySessions.includes(session.id);
  const item = sessionToItem(session);
  const url = session.url;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Session" variant="stack" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{session.title}</Text>
        {topics ? <Text style={styles.topics}>{topics}</Text> : null}

        <View style={styles.metaRow}>
          <FontAwesome5 name="clock" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatFullDay(session.dayId)} {'\u2022'} {formatTime(session.startTime, use24h)} -{' '}
            {formatTime(session.endTime, use24h)}
          </Text>
        </View>

        {stage ? (
          <View style={styles.metaRow}>
            <FontAwesome5 name="map-marker-alt" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{stage.name}</Text>
          </View>
        ) : null}

        <LiveSummary item={item} />

        <Text style={styles.description}>{session.description}</Text>

        {speakers.length ? (
          <View>
            <Text style={styles.sectionHeading}>Speakers</Text>
            {speakers.map((speaker, i) => (
              <Pressable
                key={speaker.id}
                style={[styles.speakerRow, i > 0 && styles.divider]}
                accessibilityRole={flags.speakers ? 'button' : undefined}
                accessibilityLabel={speaker.name}
                onPress={flags.speakers ? () => router.push(`/speaker/${speaker.id}`) : undefined}>
                <Avatar name={speaker.name} uri={speaker.photo} size={46} shape="square" />
                <View style={styles.speakerInfo}>
                  <Text style={styles.speakerName}>{speaker.name}</Text>
                  <Text style={styles.speakerMeta}>
                    {speaker.title}
                    {speaker.company ? `, ${speaker.company}` : ''}
                  </Text>
                </View>
                {flags.speakers ? <FontAwesome5 name="chevron-right" size={14} color={colors.textMuted} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {url ? (
          <Button
            label="Open event page"
            variant="outline"
            onPress={() => void WebBrowser.openBrowserAsync(url)}
          />
        ) : null}
        <LiveActions item={item} inAgenda={inSchedule} onToggle={() => toggleSession(session.id)} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  missing: {
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  topics: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  title: {
    ...typeScale.title,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    ...typeScale.body,
    color: colors.textMuted,
    flex: 1,
  },
  description: {
    ...typeScale.body,
    color: colors.text,
  },
  sectionHeading: {
    ...typeScale.section,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  speakerInfo: {
    flex: 1,
    gap: 2,
  },
  speakerName: {
    ...typeScale.label,
    color: colors.text,
  },
  speakerMeta: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
}));
