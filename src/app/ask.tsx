import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';

import { Composer } from '@/components/assistant/composer';
import { MessageBubble } from '@/components/assistant/message-bubble';
import { STARTERS } from '@/components/assistant/messages';
import { SuggestionRow } from '@/components/assistant/suggestion-row';
import { TypingIndicator } from '@/components/assistant/typing-indicator';
import { useConversation } from '@/components/assistant/use-conversation';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { useKeyboardOpen } from '@/components/use-keyboard-open';
import { spacing, typeScale } from '@/constants/theme';
import { useEventName } from '@/store';

export default function AskScreen() {
  const styles = useStyles();
  const { items, sending, ask, retry } = useConversation();
  const eventName = useEventName('Eventor');
  const [text, setText] = useState('');
  const list = useRef<FlatList>(null);
  const keyboardOpen = useKeyboardOpen();
  const latestAnswerId = items.reduce<number | null>((id, item) => item.role === 'answer' ? item.id : id, null);

  useEffect(() => {
    if (keyboardOpen) list.current?.scrollToEnd({ animated: true });
  }, [keyboardOpen]);

  const send = (question: string) => {
    if (ask(question)) setText('');
  };

  return (
    // Expo apps are edge-to-edge, so Android needs behavior="padding" too (Expo keyboard handling guide).
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScreenHeader title={`Ask ${eventName}`} variant="stack" />
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        // In the list, so the intro scrolls away once the chat starts instead of squeezing it on small phones.
        ListHeaderComponent={<View style={styles.intro}>
          <Text style={styles.introText}>
            Answers come only from the festival&apos;s own schedule, speakers, sponsors, startups, side events and venue.
          </Text>
          <Text style={styles.introText}>Please do not include personal details.</Text>
        </View>}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        onLayout={() => { if (keyboardOpen) list.current?.scrollToEnd({ animated: true }); }}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <MessageBubble item={item} onRetry={retry} />
            {item.role === 'answer' && item.id === latestAnswerId ? (
              <SuggestionRow suggestions={item.response.suggestions ?? []} sending={sending} onAsk={send} />
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <SuggestionRow suggestions={STARTERS} sending={sending} onAsk={send} />
        }
        ListFooterComponent={sending ? <TypingIndicator /> : undefined}
      />
      <Composer value={text} onChangeText={setText} onSend={() => send(text)} sending={sending} />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { gap: spacing.sm, paddingBottom: spacing.md },
  introText: { ...typeScale.caption, color: colors.textMuted },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  message: { gap: spacing.sm },
}));
