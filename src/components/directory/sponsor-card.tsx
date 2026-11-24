import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SponsorBand } from '@/components/directory/sponsor-band';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getPerson } from '@/data';
import type { Sponsor } from '@/data/types';

export function SponsorCard({ sponsor, reason }: { sponsor: Sponsor; reason?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const open = () => router.push(`/sponsor/${sponsor.id}`);
  return (
    <PressableScale style={styles.card} onPress={open} accessibilityRole="button" accessibilityLabel={sponsor.name}>
      <SponsorBand sponsor={sponsor} />
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
      <View style={styles.footer}>
        <View style={styles.team}>
          {sponsor.team.slice(0, 3).map((id) => (
            <Avatar key={id} name={getPerson(id)?.name ?? 'Team member'} size={20} shape="square" />
          ))}
          {sponsor.team.length > 3 ? <View style={styles.more}><Text style={styles.moreText}>+{sponsor.team.length - 3}</Text></View> : null}
        </View>
        <PressableScale onPress={open} accessibilityRole="link" accessibilityLabel={`Visit the ${sponsor.name} booth`} style={styles.link}>
          <Text style={styles.linkText}>Visit booth</Text>
          <FontAwesome5 name="arrow-right" size={11} color={colors.primary} />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.md, overflow: 'hidden' },
  reason: { ...typeScale.caption, color: colors.textMuted, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md },
  team: { flexDirection: 'row', gap: spacing.xs },
  more: { width: 20, height: 20, backgroundColor: colors.text, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  moreText: { ...typeScale.caption, fontSize: 9, color: colors.card },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, minWidth: 44 },
  linkText: { ...typeScale.label, fontSize: 12, color: colors.primary },
}));
