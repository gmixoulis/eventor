import { StyleSheet, Text, View } from 'react-native';

import { MeanderProgress } from '@/components/art/meander-line';
import { CountText } from '@/components/count-text';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { PassportProgress } from '@/lib/passport';

/** The passport score: points, stamps collected out of all, and the key filling with them. */
export function PassportScore({ progress, width }: { progress: PassportProgress; width: number }) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <View style={styles.score}>
        <CountText value={progress.points} style={styles.points} accessibilityLabel={`${progress.points} points`} />
        <Text style={styles.unit}>points</Text>
        <Text style={[styles.muted, styles.stamps]}>{progress.collected} of {progress.total} stamps</Text>
      </View>
      <MeanderProgress width={width} progress={progress.total > 0 ? progress.collected / progress.total : 0} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  wrap: { gap: spacing.md },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  points: { ...typeScale.title, color: colors.text },
  unit: { ...typeScale.body, color: colors.textMuted },
  stamps: { marginLeft: 'auto' },
  muted: { ...typeScale.caption, color: colors.textMuted },
}));
