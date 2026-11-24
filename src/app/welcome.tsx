import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollageBottom, CollageTop, Settle, WELCOME_PAPER } from '@/components/auth/welcome-collage';
import { PressableScale } from '@/components/pressable-scale';
import { brand } from '@/constants/brand';
import { lightColors, radius, spacing, typeScale } from '@/constants/theme';

const WORDMARK_RATIO = 724 / 103;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  // Replace, not push: signing in then replaces /sign-in, so Back from Home never lands here again.
  const start = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/sign-in');
  };

  return (
    <View style={styles.page}>
      {/* Pops off the status bar stack on unmount, so the root layout's themed style returns. */}
      <StatusBar style="dark" />
      <CollageTop />

      <Settle index={1} style={styles.brand}>
        <Image
          source={brand.wordmark}
          contentFit="contain"
          style={styles.wordmark}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Eventor"
        />
        <Text style={styles.tagline}>{'A Global Stage\nFor Innovation\n& Culture.'}</Text>
      </Settle>

      <CollageBottom />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {/* The shared Button follows the active theme; this page is light in both, so it mirrors Button's primary with lightColors. */}
        <PressableScale onPress={start} accessibilityRole="button" accessibilityLabel="Get started" style={styles.button}>
          <Text style={styles.buttonText}>Get started</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: WELCOME_PAPER },
  brand: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.sm, backgroundColor: WELCOME_PAPER },
  wordmark: { width: '100%', aspectRatio: WORDMARK_RATIO },
  tagline: { ...typeScale.header, color: lightColors.text, textAlign: 'right' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: WELCOME_PAPER },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: lightColors.primary,
  },
  buttonText: { ...typeScale.label, fontSize: 15, color: lightColors.onPrimary },
});
