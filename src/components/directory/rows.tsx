import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listStages } from '@/data';
import type { Person, Session, Speaker } from '@/data/types';
import { formatShortDay, formatTime } from '@/lib/format';
import { useSettings } from '@/store';

export function SpeakerRow({ speaker }: { speaker: Speaker }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/speaker/${speaker.id}`)} style={styles.speaker}>
      <Avatar name={speaker.name} uri={speaker.photo} size={46} shape="square" />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>{speaker.name}</Text>
        <Text numberOfLines={1} style={styles.caption}>{speaker.title}</Text>
        <Text numberOfLines={1} style={styles.caption}>{speaker.company}</Text>
      </View>
    </Pressable>
  );
}

export function PersonRow({ person }: { person: Person }) {
  const styles = useStyles();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/person/${person.id}`)} style={styles.person}>
      <Avatar name={person.name} size={46} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>{person.name}</Text>
        <Text numberOfLines={1} style={styles.caption}>
          {[person.role, [person.title, person.company].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

export function SessionRow({ session }: { session: Session }) {
  const styles = useStyles();
  const { use24h } = useSettings();
  const date = formatShortDay(session.dayId);
  const time = formatTime(session.startTime, use24h);
  const stage = listStages().find((item) => item.id === session.stageId)?.name ?? 'Stage';
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/session/${session.id}`)} style={styles.session}>
      <Text style={styles.label}>{session.title}</Text>
      <Text style={styles.caption}>{date} • {time} • {stage}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => {
  const divider = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border };
  return StyleSheet.create({
  speaker: { height: 57, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, ...divider },
  person: { height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, ...divider },
  copy: { flex: 1, minWidth: 0 },
  label: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  session: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xs, ...divider },
});
});
