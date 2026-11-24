import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles } from '@/components/theme';
import { windowInsets } from '@/components/window-insets';
import { motion, radius, spacing, typeScale } from '@/constants/theme';

const EASE_SHEET = Easing.bezier(...motion.easing.sheet);
// A drag past a quarter of the sheet, or a downward flick, dismisses it.
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 800;

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Shown at the end of the title row, e.g. a status tag or a close button. */
  headerRight?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet: springs up over a fading backdrop and slides back down on close.
 * Dismiss by tapping outside, the Android back button, or dragging the grab bar / title down.
 * A caller that unmounts the sheet instead of passing visible={false} skips the exit animation.
 */
export function Sheet({ visible, title, onClose, headerRight, children }: Props) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();

  // Stay mounted through the exit animation; keep the last title so it does not blank while closing.
  const [mounted, setMounted] = useState(visible);
  const [lastTitle, setLastTitle] = useState(title);
  if (visible && !mounted) setMounted(true);
  if (visible && title !== lastTitle) setLastTitle(title);

  const progress = useSharedValue(0); // 0 hidden, 1 open
  const drag = useSharedValue(0); // finger offset, positive is down
  const sheetHeight = useSharedValue(windowHeight); // fully off screen until measured

  useEffect(() => {
    if (!mounted) return;
    // Reduced motion: a short fade instead of the slide (translation is dropped in the style).
    if (visible) {
      drag.set(0);
      progress.set(
        reduced
          ? withTiming(1, { duration: motion.duration.fast, reduceMotion: ReduceMotion.Never })
          : withSpring(1, motion.spring.settle),
      );
    } else {
      progress.set(
        withTiming(
          0,
          { duration: motion.duration.exit, easing: EASE_SHEET, reduceMotion: ReduceMotion.Never },
          (finished) => {
            if (finished) scheduleOnRN(setMounted, false);
          },
        ),
      );
    }
  }, [visible, mounted, reduced, drag, progress]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (e) => {
      // Rubber-band upward drags; downward follows the finger.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY * 0.15);
    },
    onDeactivate: (e) => {
      const h = sheetHeight.get();
      if (drag.get() > h * DISMISS_FRACTION || e.velocityY > DISMISS_VELOCITY) {
        // Fold the drag into progress so the exit continues from the finger's position.
        progress.set(Math.max(0, 1 - drag.get() / h));
        drag.set(0);
        scheduleOnRN(onClose);
      } else {
        drag.set(withSpring(0, { ...motion.spring.snap, velocity: e.velocityY }));
      }
    },
  });

  const backdropStyle = useAnimatedStyle(() => {
    const dragged = Math.min(Math.max(drag.get(), 0) / sheetHeight.get(), 1);
    return { opacity: progress.get() * (1 - dragged) };
  });

  const sheetStyle = useAnimatedStyle(() =>
    reduced
      ? { opacity: progress.get(), transform: [{ translateY: drag.get() }] }
      : { transform: [{ translateY: (1 - progress.get()) * sheetHeight.get() + drag.get() }] },
  );

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          onLayout={(e) => sheetHeight.set(e.nativeEvent.layout.height)}
          style={[styles.sheet, { paddingBottom: Math.max(spacing.xl, windowInsets.bottom + spacing.sm) }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.grabBar} />
              <View style={styles.titleRow}>
                <Text style={styles.title} accessibilityRole="header">
                  {visible ? title : lastTitle}
                </Text>
                {headerRight}
              </View>
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    ...shadow.raised,
  },
  handleArea: {
    paddingTop: spacing.sm,
  },
  grabBar: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typeScale.section,
    color: colors.text,
    flex: 1,
  },
}));
