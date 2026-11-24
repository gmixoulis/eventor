import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MeanderProgress } from '@/components/art/meander-line';
import { PopIn } from '@/components/pop-in';
import { Pill } from '@/components/pill';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

type Props = {
  title: string;
  description: string;
  progress: number;
  goal: number;
  bonus: number;
  done: boolean;
  /** Width of the progress key. */
  width: number;
};

/**
 * A challenge at a glance: the count on the left as the figure to read, the reward on the right.
 * In progress shows the key filling; done swaps the count for a check, the reward reads
 * "Earned" as a status pill. A challenge that completes
 * while the screen is open pops its check in once.
 */
export function ChallengeCard({ title, description, progress, goal, bonus, done, width }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [doneOnMount] = useState(done);
  const count = `${progress} of ${goal}`;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${title}. ${description} ${count}. Bonus ${bonus} points.${done ? ' Done.' : ''}`}>
      <View style={styles.head}>
        <PopIn celebrate={done && !doneOnMount}>
          <View style={[styles.badge, done && styles.badgeDone]}>
            {done ? (
              <FontAwesome5 name="check" size={16} color={colors.success} />
            ) : (
              <Text style={styles.fraction}>
                {progress}/{goal}
              </Text>
            )}
          </View>
        </PopIn>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {done ? <Pill tone="success" label={`Earned +${bonus}`} /> : <Text style={styles.bonus}>+{bonus}</Text>}
      </View>
      {done ? null : (
        <MeanderProgress width={width} progress={goal > 0 ? progress / goal : 0} />
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: { paddingVertical: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.highlight, alignItems: 'center', justifyContent: 'center' },
  badgeDone: { backgroundColor: colors.successSoft },
  fraction: { ...typeScale.label, color: colors.text, fontVariant: ['tabular-nums'] },
  copy: { flex: 1, gap: 2 },
  title: { ...typeScale.label, color: colors.text },
  description: { ...typeScale.caption, color: colors.textMuted },
  bonus: { ...typeScale.label, color: colors.textMuted, fontVariant: ['tabular-nums'] },
}));
