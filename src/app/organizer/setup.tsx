import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment, useEffect, useReducer, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { chatEventSetup } from '@/lib/assistant-client';
import { Field, TextField } from '@/components/account/fields';
import { Composer } from '@/components/assistant/composer';
import { MessageBubble } from '@/components/assistant/message-bubble';
import { SuggestionRow } from '@/components/assistant/suggestion-row';
import { TypingIndicator } from '@/components/assistant/typing-indicator';
import { Button } from '@/components/button';
import { FeatureSwitchRow } from '@/components/feature-switch-row';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { useKeyboardOpen } from '@/components/use-keyboard-open';
import { ACCENT_COLORS, spacing, typeScale } from '@/constants/theme';
import { getEvent } from '@/data';
import { ACCENTS, applyEventSetup, cleanName, defaultEventSetup } from '@/lib/event-setup';
import { FEATURES, mergeFeatures, withFeature } from '@/lib/features';
import {
  createSetupChatState,
  SETUP_MAX_HISTORY_TURNS,
  setupChatReducer,
  toConversationItem,
  type SetupDraft,
} from '@/lib/setup-chat';
import { useDeviceSettings } from '@/store';

const defaults = (): SetupDraft => ({ name: getEvent().name, accent: 'blue', features: {} });
const noop = () => {};

export default function EventSetupScreen() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { device, setDevice } = useDeviceSettings();
  const { event, features } = device;
  const [state, dispatch] = useReducer(
    setupChatReducer,
    undefined,
    () => createSetupChatState(event ? { ...event, features } : { ...defaults(), features }),
  );
  const { draft, messages, history } = state;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardOpen = useKeyboardOpen();
  const flags = mergeFeatures(draft.features);
  const name = cleanName(draft.name);
  const defaultDraft = defaults();
  const draftIsDefault = draft.name === defaultDraft.name && draft.accent === defaultDraft.accent
    && Object.keys(draft.features).length === 0;

  useEffect(() => () => { requestId.current += 1; }, []);

  useEffect(() => {
    if (keyboardOpen) scroll.current?.scrollToEnd({ animated: true });
  }, [keyboardOpen]);

  const invalidateRequest = () => {
    requestId.current += 1;
    setBusy(false);
  };

  const editDraft = (update: (current: SetupDraft) => SetupDraft) => {
    dispatch({ type: 'edit-draft', update });
  };

  const send = async (input: string = text) => {
    const message = input.trim();
    if (!message || busy) return;
    const id = ++requestId.current;
    const recentHistory = history.slice(-SETUP_MAX_HISTORY_TURNS);
    const currentDraft = draft;
    setText('');
    setBusy(true);
    dispatch({ type: 'send', message });
    const response = await chatEventSetup({ message, history: recentHistory, draft: currentDraft });
    if (id !== requestId.current) return;
    dispatch({ type: 'turn', message, response });
    setBusy(false);
    AccessibilityInfo.announceForAccessibility('Draft updated. Review the name, colour and features, then Apply.');
  };

  const startOver = () => {
    invalidateRequest();
    setText('');
    dispatch({ type: 'start-over', draft: defaults() });
  };

  const apply = () => {
    if (!name) return;
    invalidateRequest();
    setDevice(() => applyEventSetup({ ...draft, name }));
    router.back();
  };

  const restore = () => {
    invalidateRequest();
    setText('');
    setDevice(defaultEventSetup);
    dispatch({ type: 'start-over', draft: defaults() });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScreenHeader title="Set up your event" variant="stack" />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onLayout={() => { if (keyboardOpen) scroll.current?.scrollToEnd({ animated: true }); }}>
        <View style={styles.block}>
          <Text style={styles.caption}>
            Your message goes to our server and may be sent to an AI provider to suggest a setup. Please do not include personal details.
          </Text>
          {messages.map((item) => (
            <Fragment key={item.id}>
              <MessageBubble item={toConversationItem(item)} onRetry={noop} />
              {item.ideas && item.id === messages[messages.length - 1]?.id ? (
                <SuggestionRow suggestions={item.ideas.map((idea) => idea.title)} sending={busy}
                  onAsk={(title) => void send(`Build the event app for ${title}`)} />
              ) : null}
            </Fragment>
          ))}
          {busy ? <TypingIndicator /> : null}
        </View>

        <View style={styles.block}>
          <Field label="Event name" error={name ? null : '2 to 40 characters, no links'} showError>
            <TextField
              value={draft.name}
              onChangeText={(value) => editDraft((d) => ({ ...d, name: value }))}
              accessibilityLabel="Event name"
              accessibilityHint="2 to 40 characters, no links"
            />
          </Field>
          <Text style={styles.section} accessibilityRole="header">Colour</Text>
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Colour">
            {ACCENTS.map((accent) => {
              const selected = draft.accent === accent.id;
              return (
                <Pressable
                  key={accent.id}
                  onPress={() => editDraft((d) => ({ ...d, accent: accent.id }))}
                  accessibilityRole="radio"
                  accessibilityLabel={accent.label}
                  accessibilityState={{ checked: selected }}
                  style={[styles.swatchTarget, selected && { borderColor: colors.text }]}>
                  <View style={[styles.swatch, { backgroundColor: ACCENT_COLORS[accent.id][scheme].primary }]}>
                    {selected ? <FontAwesome5 name="check" size={14} color={colors.onPrimary} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.section, styles.inset]} accessibilityRole="header">Features</Text>
        <View style={styles.list}>
          {FEATURES.map((feature) => (
            <FeatureSwitchRow
              key={feature.id}
              feature={feature}
              flags={flags}
              onChange={(id, on) => editDraft((d) => ({ ...d, features: withFeature(d.features, id, on) }))}
            />
          ))}
        </View>

        <View style={[styles.block, styles.actions]}>
          <Button label="Apply" accessibilityLabel="Apply" disabled={!name} onPress={apply} />
          <Button label="Start over" accessibilityLabel="Start over" variant="outline" onPress={startOver} />
          <Button
            label="Back to Eventor"
            accessibilityLabel="Back to Eventor"
            variant="outline"
            disabled={!busy && !event && Object.keys(features).length === 0 && draftIsDefault}
            onPress={restore}
          />
        </View>
      </ScrollView>
      <Composer value={text} onChangeText={setText} onSend={() => void send()} sending={busy}
        placeholder="Describe your event, or ask for startup ideas" />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  block: { paddingHorizontal: spacing.lg, gap: spacing.md },
  inset: { paddingHorizontal: spacing.lg },
  caption: { ...typeScale.caption, color: colors.textMuted },
  section: { ...typeScale.header, color: colors.text },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // 48 pt targets; the ring marks the chosen colour without relying on colour alone (the check does too).
  swatchTarget: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  actions: { alignItems: 'center', paddingBottom: spacing.xs },
}));
