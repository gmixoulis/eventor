import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormSubmitted } from '@/components/account/form-page';
import { MeanderProgress } from '@/components/art/meander-line';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { EASE_OUT } from '@/constants/motion';
import { motion, spacing, typeScale } from '@/constants/theme';

const STEPS = 3;

type Props = {
  step: 1 | 2 | 3;
  title: string;
  /** Continue is blocked while false; the first blocked press reveals errors. */
  valid: boolean;
  /** Inline message shown above the footer after a blocked Continue. */
  error?: string;
  onContinue: () => void;
  children: ReactNode;
};

/** Shared onboarding layout: header, the meander key drawn one third per step, scrolling content, sticky footer. */
export function OnboardingFrame({ step, title, valid, error, onContinue, children }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  // Each step opens with the key where the last step left it, then draws one more third.
  const drawn = useSharedValue((step - 1) / STEPS);
  useEffect(() => {
    drawn.set(reduced ? step / STEPS : withTiming(step / STEPS, { duration: motion.duration.enter, easing: EASE_OUT }));
  }, [drawn, reduced, step]);

  const next = () => {
    if (!valid) {
      setSubmitted(true);
      return;
    }
    onContinue();
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={title} variant="stack" />
      <View
        style={styles.progress}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${STEPS}`}
        accessibilityValue={{ min: 1, max: STEPS, now: step }}>
        <MeanderProgress width={width - spacing.lg * 2} progress={drawn} color={colors.text} />
        <Text style={styles.step}>Step {step} of {STEPS}</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <FormSubmitted value={submitted}>{children}</FormSubmitted>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {error && submitted && !valid ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          {step > 1 ? <Button label="Back" variant="outline" onPress={() => router.back()} /> : null}
          <View style={styles.primary}>
            <Button label={step === STEPS ? 'Finish' : 'Continue'} onPress={next} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  progress: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  step: { ...typeScale.caption, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.lg },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  error: { ...typeScale.caption, color: colors.danger },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  primary: { flex: 1 },
}));
