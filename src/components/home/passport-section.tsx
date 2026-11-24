import { router } from 'expo-router';
import { Text, useWindowDimensions } from 'react-native';

import { HomeSection, useHomeStyles } from '@/components/home/section';
import { PassportScore } from '@/components/passport/passport-score';
import { PressableScale } from '@/components/pressable-scale';
import { spacing } from '@/constants/theme';
import { listChallenges } from '@/data';
import { usePassport } from '@/store';

export function PassportSection() {
  const styles = useHomeStyles();
  const { width } = useWindowDimensions();
  const { progress } = usePassport();
  const next = progress.challenges.find((challenge) => !challenge.done);
  const challenge = listChallenges().find((entry) => entry.id === next?.id);
  return <HomeSection title="Festival passport" href="/passport">
    <PressableScale style={styles.card} accessibilityRole="button" accessibilityLabel="Open festival passport"
      onPress={() => router.push('/passport')}>
      <PassportScore progress={progress} width={Math.max(0, width - spacing.lg * 2 - spacing.md * 2)} />
      {next && challenge ? <Text style={styles.caption}>{challenge.title}: {next.progress} of {next.goal}</Text> : null}
    </PressableScale>
  </HomeSection>;
}
