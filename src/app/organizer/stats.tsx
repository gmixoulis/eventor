import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MeanderLoader } from '@/components/art/meander-line';
import { DirectoryPage } from '@/components/directory/ui';
import { api } from '@/backend/api';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getInterest } from '@/data';
import type { MatchmakingStats } from '@/matching/stats';

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const styles = useStyles();
  const safeMax = Math.max(1, max);
  return (
    <View style={styles.barRow}>
      <View style={styles.barTop}>
        <Text style={styles.barLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.barCount}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { flex: count }]} />
        <View style={{ flex: safeMax - count }} />
      </View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.statRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barCount}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [stats, setStats] = useState<MatchmakingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.organizer.stats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <DirectoryPage title="Matchmaking statistics" background={colors.bg}>
        <View style={styles.loadingBox} accessible accessibilityRole="progressbar" accessibilityLabel="Loading statistics">
          <MeanderLoader width={160} color={colors.text} accessibilityLabel="Loading statistics" />
          <Text style={styles.loading}>Loading statistics</Text>
        </View>
      </DirectoryPage>
    );
  }

  const maxIntent = Math.max(1, ...stats.peoplePerIntent.map((intent) => intent.count));
  const maxInterest = Math.max(1, ...stats.topInterests.map((interest) => interest.count));
  // Two groups can share an interest name; add the group only where a name repeats in this list.
  const groupName = new Map(stats.totalsPerCategory.map((category) => [category.categoryId, category.name]));
  const interestLabel = (interestId: string, name: string) => {
    if (stats.topInterests.filter((interest) => interest.name === name).length < 2) return name;
    const group = groupName.get(getInterest(interestId)?.categoryId ?? '');
    return group ? `${name} · ${group}` : name;
  };

  return (
    <DirectoryPage title="Matchmaking statistics" background={colors.bg}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading} accessibilityRole="header">
          People per intent
        </Text>
        {stats.peoplePerIntent.map((intent) => (
          <BarRow key={intent.intentId} label={intent.name} count={intent.count} max={maxIntent} />
        ))}

        <Text style={styles.heading} accessibilityRole="header">
          Top interests
        </Text>
        {stats.topInterests.map((interest) => (
          <BarRow
            key={interest.interestId}
            label={interestLabel(interest.interestId, interest.name)}
            count={interest.count}
            max={maxInterest}
          />
        ))}

        <Text style={styles.heading} accessibilityRole="header">
          Totals per category
        </Text>
        {stats.totalsPerCategory.map((category) => (
          <StatRow key={category.categoryId} label={category.name} value={category.count} />
        ))}

        <Text style={styles.heading} accessibilityRole="header">
          Networking
        </Text>
        <StatRow label="Opted out of networking" value={stats.optedOutNetworking} />
        <StatRow
          label="Selected more than 20% of interests"
          value={stats.overSelected}
        />
      </ScrollView>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  loadingBox: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  loading: { ...typeScale.caption, color: colors.textMuted },
  heading: { ...typeScale.section, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  barRow: { gap: spacing.xs, marginBottom: spacing.sm },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  barLabel: { ...typeScale.caption, color: colors.text, flexShrink: 1 },
  barCount: { ...typeScale.label, fontSize: 13, color: colors.text },
  barTrack: {
    height: 8,
    borderRadius: radius.xs,
    backgroundColor: colors.skeleton,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: { backgroundColor: colors.text, borderRadius: radius.xs },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
}));
