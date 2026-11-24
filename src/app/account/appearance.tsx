import { FontAwesome5 } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { RowGroup } from '@/components/row';
import { ScreenHeader } from '@/components/screen-header';
import { applyNativeScheme, makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale, type AppearanceSetting } from '@/constants/theme';
import { useSettings } from '@/store';

const OPTIONS: { value: AppearanceSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function AppearanceScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { appearance, set } = useSettings();

  const choose = (value: AppearanceSetting) => {
    applyNativeScheme(value);
    set({ appearance: value });
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="Appearance" variant="stack" />
      <ScrollView>
        <RowGroup caption="System follows your device's light or dark setting.">
          {OPTIONS.map((option) => {
            const selected = appearance === option.value;
            return (
              <PressableScale
                key={option.value}
                feedback="highlight"
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: selected }}
                onPress={() => choose(option.value)}
                style={styles.row}>
                <Text style={styles.label}>{option.label}</Text>
                {selected ? <FontAwesome5 name="check" size={14} color={colors.primary} /> : null}
              </PressableScale>
            );
          })}
        </RowGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  label: { ...typeScale.label, color: colors.text },
}));
