import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/backend/api';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import {
  removeNeuralModel,
  setNeuralMatching,
  useNeuralMatching,
  type ModelStatus,
} from '@/matching/embedder-provider';
import { useSettings } from '@/store';

function modelStatusText(status: ModelStatus, progress: number): string {
  switch (status) {
    case 'downloading':
      return `Downloading ${Math.round(progress * 100)}%`;
    case 'ready':
      return 'Ready, runs offline';
    case 'failed':
      return 'Could not load, using basic matching';
    case 'off':
      return 'Off, using basic matching';
    default:
      return 'Not downloaded';
  }
}

export default function CacheScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { cacheEnabled, set, clearCache } = useSettings();
  const [sizeKb, setSizeKb] = useState<number | null>(null);
  const model = useNeuralMatching();

  useEffect(() => {
    void api.storage.demoDataSizeKb().then(setSizeKb);
  }, []);

  const handleClear = async () => {
    await clearCache();
    Alert.alert('Cache cleared');
  };

  const handleRemoveModel = async () => {
    try {
      await removeNeuralModel();
    } catch {
      Alert.alert('Could not remove the model');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="App cache" variant="stack" />
      <View style={styles.content}>
        <View style={styles.list}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="database-outline" size={24} color={colors.textMuted} />
            <Text style={styles.label}>App cache enabled</Text>
            <Switch
              value={cacheEnabled}
              onValueChange={(value) => set({ cacheEnabled: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.switchThumb}
            />
          </View>
          <Pressable style={({ pressed }) => [styles.row, styles.divider, pressed && styles.pressed]} onPress={handleClear}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.textMuted} />
            <Text style={styles.label}>Clear app cache</Text>
          </Pressable>
        </View>

        <Text style={styles.caption}>
          Stored on this device: {sizeKb === null ? 'calculating' : `${sizeKb} KB`}.
        </Text>

        <Text style={styles.groupTitle}>Matching model</Text>
        <View style={styles.list}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="brain" size={24} color={colors.textMuted} />
            <View style={styles.labelBlock}>
              <Text style={styles.blockTitle}>Smarter matching (on-device AI)</Text>
              <Text style={styles.status}>{modelStatusText(model.status, model.progress)}</Text>
            </View>
            <Switch
              value={model.enabled}
              onValueChange={(value) => void setNeuralMatching(value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.switchThumb}
            />
          </View>
          <Pressable style={({ pressed }) => [styles.row, styles.divider, pressed && styles.pressed]} onPress={handleRemoveModel}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.textMuted} />
            <Text style={styles.label}>Remove downloaded model</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>
          The model is about 24 MB and is downloaded once. Your profile text never leaves this device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: spacing.lg },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  label: { ...typeScale.label, color: colors.text, flex: 1 },
  caption: { ...typeScale.caption, color: colors.textMuted, marginTop: spacing.md, paddingHorizontal: spacing.lg },
  groupTitle: { ...typeScale.section, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  labelBlock: { flex: 1 },
  // No flex here: inside a column, flex 1 collapses the title's height and the status overlaps it.
  blockTitle: { ...typeScale.label, color: colors.text },
  status: { ...typeScale.caption, color: colors.textMuted },
}));
