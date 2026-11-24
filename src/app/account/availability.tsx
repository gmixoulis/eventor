import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityGrid } from '@/components/matching/availability-grid';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';

export default function AvailabilityScreen() {
  const styles = useStyles();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="My availability" variant="stack" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>
          Others can only request meetings in the hours you select.
        </Text>
        <AvailabilityGrid />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  caption: { ...typeScale.caption, color: colors.textMuted },
}));
