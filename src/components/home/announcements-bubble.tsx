import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius } from '@/constants/theme';
import { listAnnouncements } from '@/data';
import { useAnnouncements } from '@/store';

const SIZE = 48;

/** A round button beside the greeting; the sun-yellow ring and dot mean there is something unread. */
export function AnnouncementsBubble() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { read } = useAnnouncements();
  const unread = !listAnnouncements().every((a) => read.includes(a.id));

  return (
    <PressableScale
      onPress={() => router.push('/announcements')}
      accessibilityRole="button"
      accessibilityLabel={unread ? 'Announcements, unread' : 'Announcements'}
      style={[styles.circle, unread && styles.unread]}>
      <FontAwesome5 name="bullhorn" size={18} color={unread ? colors.onAccentSoft : colors.textMuted} />
      {unread ? <View style={styles.dot} /> : null}
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
  },
}));
