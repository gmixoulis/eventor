import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Constellation } from '@/components/art/constellation';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ChallengeCard } from '@/components/passport/challenge-card';
import { newlyDone, recentStamps } from '@/components/passport/passport-logic';
import { PassportScore } from '@/components/passport/passport-score';
import { StarSheet } from '@/components/passport/star-sheet';
import { usePassportSky } from '@/components/passport/use-passport-sky';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { useFeatures, useSettings } from '@/store';

export default function PassportScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { use24h } = useSettings();
  const { flags } = useFeatures();
  const skyWidth = width - spacing.lg * 2;
  const { passport, targets, challenges, layout, collected, groups } = usePassportSky(skyWidth);
  const { progress, stamps } = passport;
  const byId = new Map(targets.map((t) => [t.id, t]));

  const [starId, setStarId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const star = starId ? byId.get(starId) ?? null : null;

  // One success haptic when a challenge completes while the screen is open; the card turns green with it.
  const doneBefore = useRef<string[] | null>(null);
  useEffect(() => {
    const done = progress.challenges.filter((c) => c.done).map((c) => c.id);
    if (doneBefore.current && newlyDone(doneBefore.current, progress.challenges).length > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    doneBefore.current = done;
  }, [progress.challenges]);

  const recent = recentStamps(stamps);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Festival passport" variant="stack" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Constellation
          layout={layout}
          collected={collected}
          completedGroups={groups}
          size={skyWidth}
          onPressStar={(id) => {
            setStarId(id);
            setSheetOpen(true);
          }}
          starLabel={(id, isCollected) => `${byId.get(id)?.title ?? 'Stamp'}, ${isCollected ? 'collected' : 'not collected yet'}`}
          hint={collected.length ? 'Tap a star to see where it is.' : 'Each place, booth and side event you visit lights a star. Tap one to see where it is.'}
        />

        <View style={styles.score}>
          <PassportScore progress={progress} width={skyWidth} />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Challenges
        </Text>
        <View style={styles.list}>
          {challenges.map((challenge, i) => {
            const state = progress.challenges.find((c) => c.id === challenge.id);
            return (
              <View key={challenge.id} style={i > 0 && styles.divider}>
                <ChallengeCard
                  title={challenge.title}
                  description={challenge.description}
                  progress={state?.progress ?? 0}
                  goal={challenge.rule.count}
                  bonus={challenge.bonus}
                  done={state?.done ?? false}
                  width={skyWidth}
                />
              </View>
            );
          })}
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Recent stamps
        </Text>
        {recent.length === 0 ? (
          <EmptyState
            illustrated
            icon="stamper"
            title="No stamps yet"
            body="Visit places, booths and side events to fill your sky."
            action={flags.map ? { label: 'Open the map', onPress: () => router.push('/map') } : undefined}
          />
        ) : (
          <View style={styles.list}>
            {recent.map((stamp, i) => (
              <View key={stamp.targetId} style={[styles.stampRow, i > 0 && styles.divider]}>
                <Text style={styles.stampTitle} numberOfLines={1}>
                  {byId.get(stamp.targetId)?.title ?? 'Stamp'}
                </Text>
                <Text style={styles.muted}>{formatDateTime(stamp.at, use24h)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {flags.leaderboard ? <Button label="Leaderboard" onPress={() => router.push('/passport/leaderboard')} /> : null}
          <Button label="Share my passport" variant="outline" onPress={() => router.push('/passport/share')} />
        </View>
      </ScrollView>

      <StarSheet
        target={star}
        collected={star ? passport.has(star.id) : false}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  score: { marginTop: spacing.sm },
  muted: { ...typeScale.caption, color: colors.textMuted },
  section: { ...typeScale.section, color: colors.text, marginTop: spacing.lg },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stampRow: { paddingVertical: spacing.md, gap: spacing.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  stampTitle: { ...typeScale.label, color: colors.text },
  actions: { gap: spacing.md, marginTop: spacing.lg, alignItems: 'stretch' },
}));
