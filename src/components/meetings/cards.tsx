import { FontAwesome5 } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Pill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { Meeting } from '@/store';

function IconRow({ icon, text }: { icon: ComponentProps<typeof FontAwesome5>['name']; text: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.iconRow}>
      <FontAwesome5 name={icon} size={11} color={colors.textMuted} style={styles.rowIcon} />
      <Text style={styles.caption}>{text}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: Meeting['status'] }) {
  const { colors } = useTheme();
  if (status === 'pending') {
    return (
      <Pill
        tone="warning"
        label="Pending Meeting"
        icon={<FontAwesome5 name="circle" solid size={6} color={colors.pendingText} />}
      />
    );
  }
  if (status === 'accepted') {
    return (
      <Pill
        tone="success"
        label="Accepted Meeting"
        icon={<FontAwesome5 name="check-circle" solid size={9} color={colors.acceptedText} />}
      />
    );
  }
  return <Pill tone="outline" label="Declined" />;
}

type MeetingCardProps = {
  meeting: Meeting;
  when: string;
  onProfile?: () => void;
  onChat?: () => void;
  onMore: () => void;
};

function useNow(): number {
  return useState(() => Date.now())[0];
}

export function MeetingCard({ meeting, when, onProfile, onChat, onMore }: MeetingCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const outbound = meeting.direction === 'outbound';
  const now = useNow();
  const waiting =
    outbound &&
    meeting.status === 'pending' &&
    now > new Date(meeting.createdAt).getTime() + 24 * 60 * 60 * 1000;
  return (
    <View style={styles.card}>
      <View style={styles.chips}>
        <StatusPill status={meeting.status} />
      </View>

      <View style={styles.person}>
        <Avatar name={meeting.name} size={46} shape="square" />
        <View style={styles.personText}>
          <Text style={styles.name}>{meeting.name}</Text>
          <Text style={styles.caption} numberOfLines={2}>
            {meeting.title} · {meeting.company}
          </Text>
          <Text style={styles.caption}>
            {[meeting.role, outbound ? 'Outbound' : 'Inbound', meeting.suggestedBy === 'organizer' ? 'Suggested by organizer' : null]
              .filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <IconRow icon="clock" text={when} />
      <IconRow icon="map-marker-alt" text={meeting.place} />
      {waiting ? <Text style={styles.waiting}>Waiting for a reply</Text> : null}

      <View style={styles.buttons}>
        {onProfile ? (
          <View style={styles.flex}>
            <Button label="Profile" variant="outline" onPress={onProfile} />
          </View>
        ) : null}
        {onChat ? (
          <View style={styles.flex}>
            <Button label="Chat" variant="outline" onPress={onChat} />
          </View>
        ) : null}
        <PressableScale onPress={onMore} hitSlop={6} accessibilityRole="button" accessibilityLabel="More actions" style={styles.more}>
          <FontAwesome5 name="ellipsis-h" size={14} color={colors.text} />
        </PressableScale>
      </View>
    </View>
  );
}

type AgendaCardProps = {
  kind: 'Session' | 'Side event';
  title: string;
  when: string;
  place: string;
  heldTag: string | null;
  onPress: () => void;
};

/** A saved session or side event in My Schedule. */
export function AgendaCard({ kind, title, when, place, heldTag, onPress }: AgendaCardProps) {
  const styles = useStyles();
  return (
    <PressableScale feedback="highlight" onPress={onPress} accessibilityRole="button" accessibilityLabel={`${kind}, ${title}`} style={styles.agenda}>
      <Text style={styles.caption}>{kind}</Text>
      <Text style={styles.sessionTitle}>{title}</Text>
      {heldTag ? <View style={styles.chips}><Pill tone="success" label={heldTag} /></View> : null}
      <IconRow icon="clock" text={when} />
      <IconRow icon="map-marker-alt" text={place} />
    </PressableScale>
  );
}

/** A hairline with a small "Now" tag between past and upcoming items. */
export function NowDivider() {
  const styles = useStyles();
  return (
    <View style={styles.nowRow} accessible accessibilityLabel="Now">
      <Pill tone="ink" label="Now" />
      <View style={styles.nowLine} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  agenda: {
    flex: 1,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  person: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  personText: { flex: 1, gap: 2 },
  name: { ...typeScale.label, fontSize: 14, lineHeight: 19, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted, flexShrink: 1 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowIcon: { width: 12, textAlign: 'center' },
  sessionTitle: { ...typeScale.label, color: colors.text },
  waiting: { ...typeScale.caption, color: colors.textMuted },
  buttons: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  nowLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  more: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
