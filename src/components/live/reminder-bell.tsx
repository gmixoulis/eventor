import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius } from '@/constants/theme';
import { useReminders } from '@/store';

export function ReminderBell({ itemKey }: { itemKey: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { has, toggle } = useReminders();
  const on = has(itemKey);
  const press = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(itemKey);
  };
  return (
    <PressableScale
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Reminder on. Turn off' : 'Remind me before this starts'}
      accessibilityState={{ selected: on }}
      style={styles.bell}>
      <FontAwesome5 name="bell" solid={on} size={18} color={on ? colors.primary : colors.textMuted} />
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    bell: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
