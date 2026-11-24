import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { useSettings } from '@/store';

export default function NotificationsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { notifications, set } = useSettings();

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="Notifications" variant="stack" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Push notifications</Text>
          <Switch
            value={notifications}
            onValueChange={(value) => set({ notifications: value })}
            accessibilityLabel="Push notifications"
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.switchThumb}
          />
        </View>
        <Text style={styles.caption}>Notifications are local to this device for now.</Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted, paddingHorizontal: spacing.lg },
}));
