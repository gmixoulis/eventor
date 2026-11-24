import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { LeaderboardEntry } from '@/store';

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const styles = useStyles();
  const podium = entry.rank <= 3;
  return (
    <View
      style={[styles.row, entry.isMe && styles.me]}
      accessible
      accessibilityLabel={`Rank ${entry.rank}, ${entry.name}${entry.isMe ? ', you' : ''}, ${entry.points} points`}>
      <View style={[styles.rank, podium && styles.podium]}>
        <Text style={[styles.rankText, podium && styles.podiumText]}>{entry.rank}</Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Avatar name={entry.name} size={40} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {entry.name}
      </Text>
      {entry.isMe ? <Text style={styles.you}>You</Text> : null}
      <Text style={styles.points}>{entry.points}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    backgroundColor: colors.card,
  },
  me: { backgroundColor: colors.highlight },
  rank: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  podium: { backgroundColor: colors.accent },
  rankText: { ...typeScale.mono, color: colors.textMuted },
  podiumText: { color: colors.onAccent },
  name: { ...typeScale.label, color: colors.text, flex: 1 },
  you: { ...typeScale.caption, color: colors.textMuted },
  points: { ...typeScale.mono, color: colors.text },
}));
