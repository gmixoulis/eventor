import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/account/fields';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { useKeyboardOpen } from '@/components/use-keyboard-open';
import { radius, spacing, typeScale } from '@/constants/theme';
import { ASK_MAX_QUESTION_CHARS } from '@/lib/assistant-contract';

const COUNTER_FROM = ASK_MAX_QUESTION_CHARS - 60;

type Props = { value: string; onChangeText: (v: string) => void; onSend: () => void; sending: boolean; placeholder?: string };

/** The pinned input row: counter near the limit, the shared TextField, a 44 dp send button. */
export function Composer({ value, onChangeText, onSend, sending, placeholder = 'Ask about the festival' }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const length = value.trim().length;
  const over = length > ASK_MAX_QUESTION_CHARS;
  const canSend = length > 0 && !over && !sending;
  return (
    <View style={[styles.bar, { paddingBottom: spacing.sm + (keyboardOpen ? 0 : insets.bottom) }]}>
      {length >= COUNTER_FROM ? (
        <Text style={[styles.counter, over && styles.over]} accessibilityLiveRegion="polite"
          accessibilityLabel={`${length} of ${ASK_MAX_QUESTION_CHARS} characters`}>
          {length}/{ASK_MAX_QUESTION_CHARS}
        </Text>
      ) : null}
      <View style={styles.row}>
        <View style={styles.field}>
          <TextField value={value} onChangeText={onChangeText} placeholder={placeholder}
            accessibilityLabel="Your question" returnKeyType="send" onSubmitEditing={() => canSend && onSend()} />
        </View>
        <PressableScale onPress={onSend} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send question"
          style={[styles.send, !canSend && styles.disabled]}>
          <FontAwesome5 name="paper-plane" solid size={16} color={colors.onPrimary} />
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  bar: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: { flex: 1 },
  counter: { ...typeScale.caption, color: colors.textMuted, alignSelf: 'flex-end' },
  over: { color: colors.danger },
  send: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
}));
