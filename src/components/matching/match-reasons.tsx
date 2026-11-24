import { FontAwesome5 } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { IdentitySpec } from '@/art/identity';
import { IdentityPair } from '@/components/art/identity-pattern';
import { Chip } from '@/components/chip';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getGoal, getInterest } from '@/data';
import { describeReason } from '@/matching/describe';
import type { Match } from '@/matching/types';

export function StaticChip({ label }: { label: string }) {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Chip label={label} />
      </View>
    </View>
  );
}

/** The match tier as plain text: pills are for status only. */
export function MatchTier({ match }: { match?: Match }) {
  const styles = useStyles();
  if (!match || (!match.explore && !match.tier)) return null;
  const top = !match.explore && match.tier === 'top';
  return <Text style={styles.tier}>{match.explore ? 'Something different' : top ? 'Top match' : 'Good match'}</Text>;
}

/** Your mark and theirs, shared layers drawn strong, with one line saying what that means. */
export function SharedMarks({ mine, theirs }: { mine: IdentitySpec; theirs: IdentitySpec }) {
  const styles = useStyles();
  return (
    <View style={styles.marks}>
      <IdentityPair a={mine} b={theirs} size={PAIR_SIZE} />
      <Text style={styles.caption}>The marks you share come from the interests you have in common.</Text>
    </View>
  );
}

/** Reasons first; `art` (the shared marks) closes whichever card comes first. */
export function MatchReasons({ match, art }: { match: Match; art?: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reasons = match.reasons.filter((reason) => reason.kind !== 'networking');
  const interestIds = [...new Set(match.reasons.flatMap((reason) => reason.kind === 'networking' ? reason.interestIds : []))];
  return (
    <>
      {reasons.length ? (
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">Why you should connect</Text>
          {reasons.map((reason, index) => (
            <View key={index} style={styles.reason}>
              <FontAwesome5 name="bolt" size={13} color={colors.textMuted} style={styles.bolt} />
              <Text style={styles.body}>{describeReason(reason, { getGoal, getInterest })}</Text>
            </View>
          ))}
          {art}
        </View>
      ) : null}
      {interestIds.length ? (
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">You both network in these areas</Text>
          <View style={styles.chips}>
            {interestIds.map((id) => <StaticChip key={id} label={getInterest(id)?.name ?? id} />)}
          </View>
          {reasons.length ? null : art}
        </View>
      ) : null}
    </>
  );
}

const PAIR_SIZE = 104;

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: { gap: spacing.sm, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  title: { ...typeScale.section, color: colors.text },
  reason: { flexDirection: 'row', gap: spacing.sm },
  bolt: { marginTop: spacing.xs },
  body: { ...typeScale.body, color: colors.text, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  marks: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  caption: { ...typeScale.caption, color: colors.textMuted, textAlign: 'center' },
  tier: { ...typeScale.caption, color: colors.textMuted },
}));
