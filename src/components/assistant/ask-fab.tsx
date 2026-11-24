import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useClearOnAccountChange } from '@/components/assistant/conversation-store';
import { PressableScale } from '@/components/pressable-scale';
import { TAB_BAR_MIN_HEIGHT } from '@/components/tab-bar';
import { showsAskFab } from '@/components/tabs';
import { makeStyles, useTheme } from '@/components/theme';
import { useKeyboardOpen } from '@/components/use-keyboard-open';
import { CSS_EASE_OUT, POP } from '@/constants/motion';
import { motion, spacing } from '@/constants/theme';
import { useFeatures, useSession } from '@/store';

const SIZE = 52;

/** The floating chat circle: bottom left, above the tab bar, on every screen where nothing sits under it. */
export function AskFab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { account, isGuest } = useSession();
  const { flags } = useFeatures();
  const keyboardOpen = useKeyboardOpen();
  useClearOnAccountChange(account?.id ?? null);

  if (!showsAskFab(pathname, isGuest, flags) || keyboardOpen) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + TAB_BAR_MIN_HEIGHT + spacing.md },
        // Nothing moves under reduced motion: no entrance at all.
        reduced ? null : { animationName: POP, animationDuration: motion.duration.enter, animationTimingFunction: CSS_EASE_OUT, animationFillMode: 'backwards' },
      ]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Ask Eventor"
        accessibilityHint="Opens the event assistant"
        style={styles.fab}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/ask');
        }}>
        <FontAwesome5 name="comment-dots" size={22} color={colors.onPrimary} />
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadow.raised,
  },
}));
