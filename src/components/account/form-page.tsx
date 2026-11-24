import { router } from 'expo-router';
import { createContext, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';

/** True once Save was pressed on an invalid form, so every field shows its error. */
export const FormSubmitted = createContext(false);

type Props = {
  title: string;
  children: ReactNode;
  onSave: () => void;
  saveDisabled?: boolean;
  navigateBack?: boolean;
};

export function FormPage({
  title,
  children,
  onSave,
  saveDisabled = false,
  navigateBack = true,
}: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);

  const save = () => {
    if (saveDisabled) {
      setSubmitted(true);
      return;
    }
    onSave();
    if (navigateBack) router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={title} variant="stack" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <FormSubmitted value={submitted}>{children}</FormSubmitted>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {/* The first press on an invalid form reveals the errors; after that Save stays disabled until it is valid. */}
        <Button label="Save" onPress={save} disabled={saveDisabled && submitted} />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
}));
