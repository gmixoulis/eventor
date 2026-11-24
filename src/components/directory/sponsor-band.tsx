import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { listSponsors } from '@/data';
import type { Sponsor } from '@/data/types';

/**
 * A sponsor header that needs no image: the logo (or initials) tile, the tier in grey and the name
 * set large. `compact` is the detail page's lead block, on the welcome art's yellow with `onArt`
 * text; the default is the list card top, plain.
 */
export function SponsorBand({ sponsor, compact }: { sponsor: Sponsor; compact?: boolean }) {
  const styles = useStyles();
  const tier = listSponsors().find((item) => item.id === sponsor.tierId);
  const tile = compact ? 64 : 52;
  return (
    <View style={[styles.band, compact && styles.compact]}>
      <View style={styles.tile}>
        <Avatar name={sponsor.name} uri={sponsor.logo} size={tile} shape="square" radius={radius.sm} fit="contain" />
      </View>
      <View style={styles.text}>
        {tier ? <Text style={[styles.tier, compact && styles.onArt]} numberOfLines={1}>{tier.name}</Text> : null}
        <Text style={[styles.name, compact && styles.onArt]} numberOfLines={2} accessibilityRole={compact ? 'header' : undefined}>{sponsor.name}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  band: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, padding: spacing.md },
  compact: { minHeight: 96, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.artYellow },
  tile: { borderRadius: radius.sm, backgroundColor: colors.card, overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
  tier: { ...typeScale.caption, color: colors.textMuted },
  name: { ...typeScale.title, fontSize: 20, lineHeight: 26, color: colors.text },
  onArt: { color: colors.onArt },
}));
