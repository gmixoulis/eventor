import { StyleSheet, Text, View } from 'react-native';

import type { ConstellationLayout } from '@/art/constellation';
import { Constellation, skyColors } from '@/components/art/constellation';
import { MeanderDivider } from '@/components/art/meander-line';
import { useTheme } from '@/components/theme';
import { radius, typeScale } from '@/constants/theme';
import { useEventName } from '@/store';

type CardProps = {
  layout: ConstellationLayout;
  collected: string[];
  name: string;
  points: number;
  /** Logical width; the card is 4:5 (1080 by 1350 at width 1080). */
  width: number;
  completedGroups: string[];
};

/**
 * Static share composition, meant to be captured later (capture and share are not implemented).
 * Read like a passport page: the holder's name at the top, the sky as the image, two figures at
 * the foot on a gold key rule. Every size is a fraction of the width so it renders the same at
 * 360 and at 1080.
 */
export function ConstellationCard({ layout, collected, name, points, width, completedGroups }: CardProps) {
  const theme = useTheme();
  const eventName = useEventName();
  const sky = skyColors(theme);
  const pad = width * 0.07;
  const inner = width - pad * 2;
  const u = width / 360;
  const ink = { color: sky.star };
  return (
    <View style={{ width, height: width * 1.25, backgroundColor: sky.ground, padding: pad, borderRadius: radius.md * u, overflow: 'hidden' }}>
      <View style={styles.top}>
        <Text style={[typeScale.overline, ink, { fontSize: 11 * u, lineHeight: 14 * u, letterSpacing: 1.8 * u }]}>
          Passport
        </Text>
        <Text style={[typeScale.overline, ink, { fontSize: 11 * u, lineHeight: 14 * u, letterSpacing: 1.2 * u }]}>
          {eventName}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        style={[typeScale.title, ink, { fontSize: 34 * u, lineHeight: 38 * u, letterSpacing: -0.6 * u, marginTop: 10 * u }]}>
        {name}
      </Text>
      <View style={styles.sky}>
        <Constellation layout={layout} collected={collected} completedGroups={completedGroups} size={inner} framed={false} />
      </View>
      <MeanderDivider width={inner} color={sky.glint} />
      <View style={[styles.figures, { marginTop: 12 * u }]}>
        <Figure value={String(points)} label="Points" u={u} color={sky.star} />
        <Figure value={`${collected.length}/${layout.stars.length}`} label="Stars" u={u} color={sky.star} />
      </View>
    </View>
  );
}

function Figure({ value, label, u, color }: { value: string; label: string; u: number; color: string }) {
  return (
    <View>
      <Text style={[typeScale.title, { color, fontSize: 28 * u, lineHeight: 32 * u, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={[typeScale.overline, { color, fontSize: 10 * u, lineHeight: 13 * u }]}>{label}</Text>
    </View>
  );
}

// Layout only; every color comes from the theme's sky tokens above.
const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sky: { flex: 1, justifyContent: 'center' },
  figures: { flexDirection: 'row', gap: 40 },
});
