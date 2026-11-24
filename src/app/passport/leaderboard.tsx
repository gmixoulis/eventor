import { useFocusEffect } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View, type ListViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LeaderboardRow } from '@/components/passport/leaderboard-row';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { usePassport } from '@/store';

const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

export default function LeaderboardScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { leaderboard, refreshLeaderboard } = usePassport();
  const [visibleRows, setVisibleRows] = useState<number[]>([]);

  useFocusEffect(() => {
    void refreshLeaderboard();
  });

  // FlatList rejects a changing onViewableItemsChanged, so the handler is created once.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    setVisibleRows(viewableItems.flatMap((token) => (typeof token.index === 'number' ? [token.index] : [])));
  });

  const me = leaderboard.find((entry) => entry.isMe);
  const visibleRanks = visibleRows.flatMap((i) => (leaderboard[i] ? [leaderboard[i].rank] : []));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Leaderboard" variant="stack" />
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => `${item.rank}-${item.name}`}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={VIEWABILITY}
        ListEmptyComponent={<EmptyState illustrated icon="trophy-outline" title="No scores yet" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
      />
      {/* The current account's row repeats here while it is off screen. */}
      {me && !visibleRanks.includes(me.rank) ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.footerText}>Your rank: {me.rank}, {me.points} points</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  footer: {
    backgroundColor: colors.highlight,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.raised,
  },
  footerText: { ...typeScale.label, color: colors.text },
}));
