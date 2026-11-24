import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';

type Props = {
  count: number;
  index: number;
  progress: SharedValue<number>;
};

export function StoryProgress({ count, index, progress }: Props) {
  const styles = useStyles();
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.track}>
          {i < index ? <View style={[styles.fill, styles.full]} /> : null}
          {i === index ? <Animated.View style={[styles.fill, fillStyle]} /> : null}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: colors.borderStrong,
  },
  fill: { height: '100%', backgroundColor: colors.primary },
  full: { width: '100%' },
}));
