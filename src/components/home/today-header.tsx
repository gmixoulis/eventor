import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { AnnouncementsBubble } from '@/components/home/announcements-bubble';
import { useHomeStyles } from '@/components/home/section';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { eventWallClock } from '@/lib/event-clock';
import { parseDay } from '@/lib/format';
import { useEventClock, useFeatures, useSession } from '@/store';

/** The top of Home: the event day set large over the New York wash, Activity and Announcements beside it. */
export function TodayHeader() {
  const styles = useHomeStyles();
  const local = useStyles();
  const { colors } = useTheme();
  const { isGuest } = useSession();
  const { flags } = useFeatures();
  const { now } = useEventClock();
  const { weekday, month, day } = parseDay(eventWallClock(now).day);
  return <View style={local.wrap}>
    <View style={local.top}>
      <View style={local.grow} accessible accessibilityRole="header" accessibilityLabel={`${weekday}, ${month} ${day}`}>
        <Text style={local.weekday}>{weekday}</Text>
        <View style={local.dateBlock}><Text style={local.date}>{month} {day}</Text></View>
      </View>
      {isGuest ? null : <PressableScale onPress={() => router.push('/activity')} accessibilityRole="button"
        accessibilityLabel="Activity" style={local.circle}>
        <FontAwesome5 name="history" size={17} color={colors.textMuted} />
      </PressableScale>}
      {flags.announcements ? <AnnouncementsBubble /> : null}
    </View>
    {isGuest ? <View style={styles.card}>
      <Text style={local.cardTitle}>You are browsing as a visitor</Text>
      <Text style={styles.caption}>Sign in to get matched, book meetings and save your agenda.</Text>
      <Button label="Sign in" accessibilityLabel="Sign in" onPress={() => router.push('/sign-in')} />
    </View> : null}
  </View>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  grow: { flex: 1, alignItems: 'flex-start' },
  // The page title of Home: the day, larger than any other text in the app.
  weekday: { ...typeScale.title, fontSize: 44, lineHeight: 48, letterSpacing: -1, color: colors.text },
  // The date on a yellow block from the welcome art; black text on it in both themes.
  dateBlock: { backgroundColor: colors.artYellow, paddingHorizontal: spacing.sm, marginTop: spacing.xs },
  date: { ...typeScale.title, fontSize: 22, lineHeight: 30, color: colors.onArt },
  cardTitle: { ...typeScale.header, color: colors.text },
  // Same round button as the announcements bubble beside it.
  circle: { width: 48, height: 48, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
}));
