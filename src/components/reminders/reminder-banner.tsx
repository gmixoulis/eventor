import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Button } from '@/components/button';
import { itemHref } from '@/lib/agenda-item';
import { PressableScale } from '@/components/pressable-scale';
import { hidesReminders, reminderText } from '@/components/reminders/helpers';
import { makeStyles, useTheme } from '@/components/theme';
import { CSS_EASE_OUT, FADE_IN } from '@/constants/motion';
import { motion, radius, spacing, typeScale } from '@/constants/theme';
import { useReminders, useReservations, useSession } from '@/store';

const SLIDE = { from: { opacity: 0, transform: [{ translateY: -motion.rise * 2 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };

export function ReminderBanner() {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { due, dismiss } = useReminders();
  const { statusOf } = useReservations();
  const { account, isGuest } = useSession();
  const seen = useRef(new Set<string>());
  const owner = useRef(account?.id);
  const reminder = isGuest || hidesReminders(pathname) ? null : (due[0] ?? null);
  const key = reminder?.item.key;
  const text = reminder ? reminderText(reminder, statusOf(reminder.item.key) === 'waitlist') : '';
  const announcement = reminder ? `${text}. ${reminder.item.place}` : null;
  useEffect(() => {
    if (owner.current !== account?.id) {
      owner.current = account?.id;
      seen.current.clear();
    }
    if (!key || seen.current.has(key)) return;
    seen.current.add(key);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (Platform.OS === 'ios' && announcement) {
      AccessibilityInfo.announceForAccessibilityWithOptions(announcement, { queue: true });
    }
  }, [key, account?.id, announcement]);
  if (!reminder) return null;
  const banner = <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + spacing.xs }]}>
    <Animated.View key={reminder.item.key} exiting={FadeOut.duration(motion.duration.exit)} style={[styles.banner, {
      // Same enter and exit as sheets: ease-out in, a shorter fade out. Reduced motion keeps the fade.
      animationName: reduced ? FADE_IN : SLIDE, animationDuration: motion.duration.enter, animationTimingFunction: CSS_EASE_OUT,
    }]} accessibilityLiveRegion="polite">
      <FontAwesome5 name="bell" size={16} color={colors.text} />
      <View style={styles.copy}>
        <Text style={styles.title}>{text}</Text>
        <Text style={styles.caption}>
          {due.length > 1 ? `${reminder.item.place} · +${due.length - 1} more` : reminder.item.place}
        </Text>
      </View>
      <Button label="Open" accessibilityLabel={`Open ${reminder.item.title}`} variant="outline"
        onPress={() => { dismiss(reminder.item.key); router.push(itemHref(reminder.item)); }} />
      <PressableScale style={styles.close} accessibilityRole="button" accessibilityLabel="Dismiss reminder"
        onPress={() => dismiss(reminder.item.key)}><FontAwesome5 name="times" size={18} color={colors.textMuted} /></PressableScale>
    </Animated.View>
  </View>;
  return Platform.OS === 'ios' ? <FullWindowOverlay>{banner}</FullWindowOverlay> : banner;
}

const useStyles = makeStyles(({ colors, shadow }) => StyleSheet.create({
  overlay: { position: 'absolute', left: spacing.sm, right: spacing.sm, zIndex: 1000, elevation: 20 },
  // One row: bell, title and place (wrapping), then Open and close on the right.
  banner: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingLeft: spacing.md,
    paddingRight: spacing.xs, gap: spacing.sm, backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, ...shadow.raised },
  copy: { flex: 1, minWidth: 0 },
  title: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
