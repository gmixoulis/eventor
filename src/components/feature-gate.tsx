import { usePathname, useSegments } from 'expo-router';
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gatePath } from '@/components/auth/routes';
import { backToHome } from '@/components/auth/visitor-gate';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';
import { isPathEnabled } from '@/lib/features';
import { useFeatures } from '@/store';

type Props = {
  /** The path this screen stands for (see screenPath); decides which feature owns it. */
  path: string;
  children: ReactElement;
};

/**
 * Root Stack screen layout, beside the visitor gate: a screen whose feature an organizer switched off shows this
 * page instead, so a direct link or a tab left open never reaches it. The screen itself is not mounted.
 */
export function FeatureGate({ path, children }: Props) {
  const styles = useStyles();
  const { flags } = useFeatures();
  // Same live-tab rule as the visitor gate: a tab group is judged by the tab showing now.
  const pathname = usePathname();
  const segments = useSegments();

  if (isPathEnabled(gatePath(path, pathname, segments), flags)) return children;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState icon="lock-outline" illustrated title="Not available" body="This part of the app is switched off." />
        <View style={styles.actions}>
          <Button label="Back to Home" accessibilityLabel="Back to Home" onPress={() => backToHome(pathname)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center' },
  actions: { paddingHorizontal: spacing.xl, alignItems: 'center' },
}));
