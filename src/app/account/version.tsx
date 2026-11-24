import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';

export default function VersionScreen() {
  const styles = useStyles();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const otaVersion = Updates.updateId ?? 'embedded';
  const otaChannel = Updates.channel ?? 'none';
  const environment = __DEV__ ? 'development' : 'production';

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="App version" variant="stack" />
      <View style={styles.card}>
        <Text style={styles.version}>{version}</Text>
        <Text style={styles.line}>OTA version: {otaVersion}</Text>
        <Text style={styles.line}>OTA channel: {otaChannel}</Text>
        <Text style={styles.line}>App version: {version}</Text>
        <Text style={styles.line}>Environment: {environment}</Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  card: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  version: { ...typeScale.section, color: colors.text, marginBottom: spacing.sm },
  line: { ...typeScale.mono, color: colors.textMuted },
}));
