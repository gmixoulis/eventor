import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/theme';
import { CROWD_DEMO_NOTE, CROWD_LEVELS, CROWD_META, type CrowdLevel } from '@/components/venue/crowd-demo';
import type { Palette } from '@/constants/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

/** Low is green, medium orange, red crowded: the shared semantic tokens, so both themes stay legible. */
export function crowdColors(level: CrowdLevel, colors: Palette): { fg: string; bg: string } {
  if (level === 'high') return { fg: colors.danger, bg: colors.dangerSoft };
  if (level === 'medium') return { fg: colors.warning, bg: colors.warningSoft };
  return { fg: colors.success, bg: colors.successSoft };
}

/** A small filled circle for lists and map pins. Decorative; callers carry the accessible label. */
export function CrowdDot({ level, size = 10 }: { level: CrowdLevel; size?: number }) {
  const { colors } = useTheme();
  const { fg } = crowdColors(level, colors);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fg }} />;
}

export function crowdLabel(level: CrowdLevel): string {
  return `Crowd level: ${CROWD_META[level].caption} (demo)`;
}

/** The chip shown in building details: dot, level word and plain-language caption. */
export function CrowdBadge({ level }: { level: CrowdLevel }) {
  const { colors } = useTheme();
  const { fg, bg } = crowdColors(level, colors);
  return (
    <View accessibilityLabel={crowdLabel(level)} style={[styles.badge, { backgroundColor: bg }]}>
      <CrowdDot level={level} />
      <Text style={[styles.badgeText, { color: fg }]}>{CROWD_META[level].word} · {CROWD_META[level].caption}</Text>
    </View>
  );
}

/** The map's crowd key: the three levels plus the simulated-data note. */
export function CrowdLegend() {
  const styles2 = useLegendStyles();
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={`Crowd levels, ${CROWD_DEMO_NOTE}`} style={styles2.legend}>
      <Text style={styles2.title}>Crowd (demo)</Text>
      {CROWD_LEVELS.map((level) => (
        <View key={level} style={styles2.row}>
          <CrowdDot level={level} />
          <Text style={styles2.rowText}>{CROWD_META[level].word}</Text>
        </View>
      ))}
      <Text style={[styles2.note, { color: colors.textMuted }]}>Simulated, not live</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { ...typeScale.label },
});

const useLegendStyles = () => {
  const { colors, shadow } = useTheme();
  return StyleSheet.create({
    legend: { gap: 2, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.card, ...shadow.card },
    title: { ...typeScale.overline, color: colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    rowText: { ...typeScale.caption, color: colors.text },
    note: { ...typeScale.caption, fontSize: 10 },
  });
};
