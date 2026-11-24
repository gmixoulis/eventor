import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { MatchTier } from '@/components/matching/match-reasons';
import { PressableScale } from '@/components/pressable-scale';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { fonts, spacing, typeScale } from '@/constants/theme';
import { getGoal, getInterest } from '@/data';
import type { Person } from '@/data/types';
import { describeReason, shortReason } from '@/matching/describe';
import type { Match } from '@/matching/types';
import { useMatchFeedback } from '@/store';

/** `compact` (Home): one short reason on one line; the People screen keeps the full sentences. */
export function MatchCard({ person, match, onHide, compact = false }: { person: Person; match?: Match; onHide: () => void; compact?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [actions, setActions] = useState(false);
  const { bookmark, unbookmark, bookmarked } = useMatchFeedback();
  const saved = bookmarked.includes(person.id);
  const bookmarkLabel = saved ? 'Remove bookmark' : 'Bookmark';
  const toggleBookmark = () => saved ? unbookmark(person.id) : bookmark(person.id);
  const reason = match?.reasons[0];
  const more = (match?.reasons.length ?? 0) - 1;

  return (
    <View style={styles.card}>
      <PressableScale feedback="highlight" style={[styles.open, compact && styles.compact]}
        accessibilityRole="button" accessibilityLabel={`View ${person.name}'s profile`}
        accessibilityHint="Long press for bookmark and not relevant actions"
        accessibilityActions={[{ name: 'longpress', label: 'Show person actions' }]}
        onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'longpress') setActions(true); }}
        onLongPress={() => setActions(true)}
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.id } })}>
        <View style={styles.row}>
          <Avatar name={person.name} size={48} />
          <View style={styles.copy}>
            <View style={styles.firstLine}>
              <Text style={styles.role}>{person.role}</Text>
              <MatchTier match={match} />
            </View>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.caption} numberOfLines={1}>{[person.title, person.company].filter(Boolean).join(', ')}</Text>
          </View>
        </View>
        {reason ? (
          <Text style={styles.reasonText} numberOfLines={compact ? 1 : 2}>
            {(compact ? shortReason : describeReason)(reason, { getGoal, getInterest })}
          </Text>
        ) : null}
        {more > 0 && !compact ? <Text style={styles.caption}>+{more} more {more === 1 ? 'reason' : 'reasons'}</Text> : null}
      </PressableScale>
      <PressableScale style={styles.bookmark} accessibilityRole="button"
        accessibilityLabel={`${bookmarkLabel} ${person.name}`} accessibilityState={{ selected: saved }} onPress={toggleBookmark}>
        <FontAwesome5 name="bookmark" solid={saved} size={18} color={colors.primary} />
      </PressableScale>
      {actions ? (
        <Sheet visible title={person.name} onClose={() => setActions(false)}>
          <Button label="Not relevant" accessibilityLabel={`Hide ${person.name}`} variant="ghost"
            onPress={() => { setActions(false); onHide(); }} />
          <Button label={bookmarkLabel} accessibilityLabel={`${bookmarkLabel} ${person.name}`} variant="ghost"
            onPress={() => { toggleBookmark(); setActions(false); }} />
          <Button label="Cancel" accessibilityLabel="Close person actions" variant="ghost" onPress={() => setActions(false)} />
        </Sheet>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  open: { padding: spacing.lg, paddingRight: spacing.lg + 44, gap: spacing.sm },
  // On Home the section already pads the sides.
  compact: { paddingLeft: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, minWidth: 0 },
  firstLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  // The role tells Investor from Startup in a mixed list, so it stays: small, grey, sentence case.
  role: { ...typeScale.caption, fontFamily: fonts.sansSemibold, color: colors.textMuted },
  name: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  reasonText: { ...typeScale.caption, color: colors.text, flex: 1 },
  bookmark: { position: 'absolute', right: spacing.sm, top: spacing.sm, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center' },
}));
