import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FadeInView } from '@/components/fade-in-view';
import { hintFlags } from '@/components/matching/goals';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { listInterests } from '@/data';
import { useProfile } from '@/store';

/** "Improve your matches" card: shown when over-selection or an empty introduction costs rank. */
export function MatchHint() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { tooMany, noIntro } = hintFlags(
    profile.selections.length,
    listInterests().length,
    profile.intro,
  );
  if (!tooMany && !noIntro) return null;

  return (
    <FadeInView style={styles.card}>
      <FontAwesome5 name="info-circle" solid size={16} color={colors.textMuted} />
      <View style={styles.text}>
        {tooMany ? (
          <Text style={styles.body}>
            You selected many interests. Picking fewer, more specific ones moves you higher in other
            people&apos;s matches.
          </Text>
        ) : null}
        {noIntro ? (
          <Text style={styles.body}>
            Add an introduction so we can match you on what you actually do.{' '}
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => router.push('/account/event-info')}>
              Add introduction
            </Text>
          </Text>
        ) : null}
      </View>
    </FadeInView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.highlight,
  },
  text: { flex: 1, gap: spacing.sm },
  body: { ...typeScale.body, color: colors.text },
  link: { ...typeScale.body, color: colors.primary, textDecorationLine: 'underline' },
}));
