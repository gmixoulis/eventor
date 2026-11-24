import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { StatusPill } from '@/components/live/status-pill';
import { Pill } from '@/components/pill';
import { sessionLength } from '@/components/schedule/agenda-math';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { Session } from '@/data/types';
import { formatTime } from '@/lib/format';
import type { LiveStatus } from '@/lib/live-status';

type CardProps = {
  session: Session;
  stageName: string;
  stageBorder: string;
  trackName: string | undefined;
  tagNames: string[];
  speakers: { name: string; photo?: string }[];
  inAgenda: boolean;
  overlapLabel: string | null;
  status: LiveStatus;
  /** "Reserved" or "Waitlist N" when the user holds one. */
  heldTag: string | null;
  following: boolean;
  use24h: boolean;
  onToggle: () => void;
  onPress: () => void;
};

export function SessionCard({
  session,
  stageName,
  stageBorder,
  trackName,
  tagNames,
  speakers,
  inAgenda,
  overlapLabel,
  status,
  heldTag,
  following,
  use24h,
  onToggle,
  onPress,
}: CardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const visibleTags = tagNames.slice(0, 2);
  const extraTags = tagNames.length - visibleTags.length;
  // Track and tags are plain text: pills are for status only.
  const topics = [trackName, ...visibleTags].filter(Boolean).join(' · ') + (extraTags > 0 ? ` +${extraTags}` : '');
  const visibleSpeakers = speakers.slice(0, 3);
  const extraSpeakers = speakers.length - visibleSpeakers.length;
  const speakerNames = speakers.map((s) => s.name).join(', ');

  const toggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={session.title}>
      <View style={[styles.cardBar, { backgroundColor: stageBorder }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {session.title}
        </Text>

        <View style={styles.metaRow}>
          <FontAwesome5 name="clock" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatTime(session.startTime, use24h)} - {formatTime(session.endTime, use24h)} ·{' '}
            {sessionLength(session.startTime, session.endTime)}
          </Text>
        </View>

        {stageName ? (
          <View style={styles.metaRow}>
            <FontAwesome5 name="map-marker-alt" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{stageName}</Text>
          </View>
        ) : null}

        {topics ? <Text style={styles.metaText} numberOfLines={1}>{topics}</Text> : null}

        {/* Speakers on the left, status cluster pushed to the right edge so the row fills its width. */}
        <View style={styles.footerRow}>
          {speakers.length > 0 ? (
            <View style={styles.speakersRow}>
              <View style={styles.avatarStack}>
                {visibleSpeakers.map((s, i) => (
                  <View key={s.name} style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}>
                    <Avatar uri={s.photo} name={s.name} size={28} />
                  </View>
                ))}
              </View>
              <Text style={styles.speakerNames} numberOfLines={1}>
                {speakerNames}
                {extraSpeakers > 0 ? ` +${extraSpeakers}` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.footerSpacer} />
          )}
          <View style={styles.statusCluster}>
            <StatusPill status={status} compact />
            {heldTag ? <Pill tone="neutral" label={heldTag} /> : null}
            {following ? <Text style={styles.metaText}>Following</Text> : null}
          </View>
        </View>

        {overlapLabel ? (
          <View style={styles.overlapRow}>
            <FontAwesome5 name="exclamation-circle" size={12} color={colors.pendingText} />
            <Text style={styles.overlapText} numberOfLines={1}>
              {overlapLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={toggle}
        style={styles.starButton}
        accessibilityRole="button"
        accessibilityLabel={inAgenda ? 'Remove from my agenda' : 'Add to my agenda'}
        accessibilityState={{ selected: inAgenda }}>
        <FontAwesome5
          name="star"
          solid={inAgenda}
          size={18}
          color={inAgenda ? colors.primary : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  // A plain row with the stage colour as its left edge and a divider under it.
  card: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg - 4,
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typeScale.label,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    paddingRight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    ...typeScale.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  footerSpacer: {
    flex: 1,
  },
  speakersRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing.xs,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bg,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  speakerNames: {
    ...typeScale.caption,
    color: colors.textMuted,
    flex: 1,
  },
  overlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  overlapText: {
    ...typeScale.caption,
    color: colors.pendingText,
    flexShrink: 1,
  },
  starButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
