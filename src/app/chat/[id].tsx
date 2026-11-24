import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { useKeyboardOpen } from '@/components/use-keyboard-open';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getPerson } from '@/data';
import { formatTime } from '@/lib/format';
import { useChat, useSettings } from '@/store';

export default function ChatScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = getPerson(id);
  const { messages, send } = useChat(id);
  const { use24h } = useSettings();
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const canSend = text.trim().length > 0;

  const onSend = () => {
    if (!canSend) return;
    send(text.trim());
    setText('');
  };

  return (
    // Expo apps are edge-to-edge, so Android needs behavior="padding" too (Expo keyboard handling guide).
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScreenHeader title={person?.name ?? 'Chat'} variant="stack" />
      <Text style={[styles.caption, styles.demoNote]}>Demo chat: messages are saved on this phone and not delivered</Text>
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.caption}>Say hello to {person?.name.split(' ')[0] ?? 'them'}</Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.message, item.mine ? styles.mine : styles.theirs]}>
              <View style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.body, item.mine && styles.bodyMine]}>{item.text}</Text>
              </View>
              <Text style={styles.caption}>{formatTime(new Date(item.sentAt), use24h)}</Text>
            </View>
          )}
        />
      )}
      <View style={[styles.inputBar, { paddingBottom: spacing.sm + (keyboardOpen ? 0 : insets.bottom) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message"
          placeholderTextColor={colors.textMuted} cursorColor={colors.primary} selectionColor={colors.primary}
          multiline
          maxLength={500}
          style={styles.input}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          hitSlop={2}
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          style={[styles.send, !canSend && styles.sendDisabled]}>
          <FontAwesome5 name="paper-plane" solid size={16} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  message: { maxWidth: '80%', gap: 2 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.text },
  bubbleTheirs: { backgroundColor: colors.card },
  body: { ...typeScale.body, color: colors.text },
  bodyMine: { color: colors.bg },
  caption: { ...typeScale.caption, color: colors.textMuted },
  demoNote: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    ...typeScale.body,
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
}));
