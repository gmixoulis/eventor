import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DirectoryPage } from '@/components/directory/ui';
import { FeatureSwitchRow } from '@/components/feature-switch-row';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing } from '@/constants/theme';
import { FEATURES } from '@/lib/features';
import { useDeviceSettings, useFeatures } from '@/store';

export default function FeatureSwitchesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { device } = useDeviceSettings();
  const { flags, setFeature, resetFeatures } = useFeatures();

  return (
    <DirectoryPage title="Feature switches" background={colors.bg}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.list}>
          {FEATURES.map((feature) => <FeatureSwitchRow key={feature.id} feature={feature} flags={flags} onChange={setFeature} />)}
        </View>
        <View style={styles.actions}>
          <Button
            label="Reset to defaults"
            accessibilityLabel="Reset to defaults"
            variant="outline"
            disabled={Object.keys(device.features).length === 0}
            onPress={() => {
              resetFeatures();
              AccessibilityInfo.announceForAccessibility('Feature switches reset to defaults');
            }}
          />
        </View>
      </ScrollView>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  actions: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xs, alignItems: 'center' },
}));
