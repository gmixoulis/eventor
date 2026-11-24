import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { makeStyles, useTheme } from '@/components/theme';
import { encodeCheckpoint } from '@/components/venue/checkpoint';
import { CrowdBadge } from '@/components/venue/crowd';
import { CROWD_DEMO_NOTE, crowdLevel } from '@/components/venue/crowd-demo';
import { placeStageId, talksAt } from '@/components/venue/talks';
import { windowInsets } from '@/components/window-insets';
import { motion, radius, spacing, typeScale } from '@/constants/theme';
import { getSpeaker } from '@/data';
import type { Place, Session } from '@/data/types';
import { eventWallClock } from '@/lib/event-clock';
import { formatTime } from '@/lib/format';
import { useBookmarks, useEventClock, useSettings } from '@/store';

export function PlaceSheet({ place, onClose, onDirections }: { place: Place; onClose: () => void; onDirections: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { bookmarked, visited, toggleBookmark, toggleVisited } = useBookmarks();
  const { use24h } = useSettings();
  const { now } = useEventClock();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [showCode, setShowCode] = useState(false);
  const isVisited = visited.includes(place.id);
  const isBookmarked = bookmarked.includes(place.id);
  const level = crowdLevel(place.id);
  const dayId = eventWallClock(now).day;
  const stageId = placeStageId(place);
  const talks = stageId ? talksAt(place, dayId) : [];
  const openSchedule = () => router.push(`/schedule?day=${encodeURIComponent(dayId)}&stage=${encodeURIComponent(stageId!)}`);

  return (
    <Animated.View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}
      entering={reduceMotion ? undefined : SlideInDown.duration(motion.duration.enter)}
      exiting={reduceMotion ? undefined : SlideOutDown.duration(motion.duration.exit)}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.icon}><FontAwesome5 name="map-marker-alt" size={14} color={colors.card} /></View>
          <Text accessibilityRole="header" style={styles.name}>{place.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close place" hitSlop={12} onPress={onClose} style={styles.close}>
            <FontAwesome5 name="times" size={16} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.description}>{place.description}</Text>
        {level ? (
          <View style={styles.crowd}>
            <CrowdBadge level={level} />
            <Text style={styles.note}>{CROWD_DEMO_NOTE}</Text>
          </View>
        ) : null}
        {stageId ? (
          <View style={styles.talks}>
            <Text accessibilityRole="header" style={styles.talksHeading}>Today&apos;s talks</Text>
            {talks.length ? talks.map((session) => <TalkRow key={session.id} session={session} use24h={use24h} />) : (
              <Text style={styles.note}>No talks here today.</Text>
            )}
            <Button label="Today's talks in schedule" accessibilityLabel={`Open the schedule for ${place.name} today`}
              variant="outline" onPress={openSchedule} />
          </View>
        ) : null}
        <Button label="Directions" accessibilityLabel={`Directions to ${place.name}`} onPress={onDirections} />
        <Button label={isBookmarked ? 'Remove bookmark' : 'Bookmark'} accessibilityLabel={`${isBookmarked ? 'Remove bookmark for' : 'Bookmark'} ${place.name}`} variant="outline" onPress={() => toggleBookmark(place.id)} />
        <Pressable accessibilityRole="button" accessibilityLabel={isVisited ? 'Mark as not visited' : 'Mark visited'} accessibilityState={{ selected: isVisited }}
          onPress={() => toggleVisited(place.id)} style={styles.visited}>
          {isVisited ? <FontAwesome5 name="check" size={13} color={colors.card} /> : null}
          <Text style={styles.visitedText}>{isVisited ? 'Visited' : 'Mark visited'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Show the checkpoint code for ${place.name}`} onPress={() => setShowCode(true)} style={styles.codeRow}>
          <FontAwesome5 name="qrcode" size={14} color={colors.primary} />
          <Text style={styles.codeText}>Checkpoint code</Text>
          <FontAwesome5 name="expand" size={12} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
      {showCode ? <Modal visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setShowCode(false)}>
        <View style={[styles.codePage, { paddingTop: windowInsets.top + spacing.lg, paddingBottom: windowInsets.bottom + spacing.lg }]}>
          <View style={styles.codeBody}>
            <View accessible accessibilityRole="image" accessibilityLabel={`Checkpoint QR code for ${place.name}`} style={styles.qrCard}>
              <QRCode value={encodeCheckpoint(place.id)} size={240} />
            </View>
            <Text accessibilityRole="header" style={styles.codeName}>{place.name}</Text>
            <Text style={styles.codeHint}>Print this code at the place. Scanning it in the Map sets the visitor&apos;s position here.</Text>
          </View>
          <Button label="Close" onPress={() => setShowCode(false)} />
        </View>
      </Modal> : null}
    </Animated.View>
  );
}

/** One of today's talks in this hall: title, time, speakers and a one-line summary; opens the session. */
function TalkRow({ session, use24h }: { session: Session; use24h: boolean }) {
  const styles = useStyles();
  const speakers = session.speakerIds.map((id) => getSpeaker(id)?.name).filter(Boolean).join(', ');
  const time = `${formatTime(session.startTime, use24h)} – ${formatTime(session.endTime, use24h)}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${session.title}, ${time}${speakers ? `, ${speakers}` : ''}`}
      onPress={() => router.push(`/session/${session.id}`)} style={styles.talkRow}>
      <Text style={styles.talkTitle} numberOfLines={2}>{session.title}</Text>
      <Text style={styles.talkMeta}>{time}{speakers ? ` · ${speakers}` : ''}</Text>
      {session.description ? <Text style={styles.note} numberOfLines={2}>{session.description}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '72%', zIndex: 6,
    backgroundColor: colors.card, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: spacing.lg },
  content: { gap: spacing.lg },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center' },
  name: { ...typeScale.section, fontSize: 16, color: colors.text, flex: 1 },
  close: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  description: { ...typeScale.body, color: colors.text },
  crowd: { gap: spacing.xs },
  note: { ...typeScale.caption, color: colors.textMuted },
  talks: { gap: spacing.sm },
  talksHeading: { ...typeScale.section, fontSize: 15, color: colors.text },
  talkRow: { gap: 2, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  talkTitle: { ...typeScale.label, color: colors.text },
  talkMeta: { ...typeScale.caption, color: colors.textMuted },
  visited: { minHeight: 44, borderRadius: radius.sm, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  visitedText: { ...typeScale.label, color: colors.card },
  codeRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  codeText: { ...typeScale.label, color: colors.primary, flex: 1 },
  codePage: { flex: 1, paddingHorizontal: spacing.xl, backgroundColor: colors.card },
  codeBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  // Scanners need dark modules on a light quiet zone, so the code always sits on a white card.
  qrCard: { backgroundColor: '#FFFFFF', padding: spacing.lg, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  codeName: { ...typeScale.section, fontSize: 18, color: colors.text, textAlign: 'center' },
  codeHint: { ...typeScale.body, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
}));
