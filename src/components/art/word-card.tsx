import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Word } from '@/art/words';
import { MeanderDivider } from '@/components/art/meander-line';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

type Props = {
  word: Word;
  /** Card width in dp; the term scales with it. Defaults to the window minus screen gutters. */
  width?: number;
};

/**
 * Typography as the image. The term is set large in the heading face; tight tracking and a large
 * size carry the hierarchy, not color. Pronunciation and a short gloss sit beneath it.
 * 
 */
export function WordCard({ word, width: given }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const window = useWindowDimensions();
  const width = given ?? window.width - spacing.lg * 2;
  const inner = width - spacing.xl * 2;
  // The longest terms still fit on one line at this ratio.
  const termSize = Math.min(72, Math.round(inner / Math.max(5, word.term.length * 0.56)));
  return (
    <View style={[styles.card, { width }]} accessible accessibilityLabel={`Word of the day: ${word.english}. ${word.meaning} ${word.atEvent}`}>
      <MeanderDivider width={inner} color={colors.primary} />
      <Text style={[styles.overline, styles.top]}>A word a day</Text>
      <Text
        style={[styles.term, { fontSize: termSize, lineHeight: Math.round(termSize * 1.12), letterSpacing: -termSize * 0.025 }]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {word.term}
      </Text>
      <View style={styles.names}>
        <Text style={styles.translit}>{word.pronunciation}</Text>
        <Text style={styles.english}>{word.english}</Text>
      </View>
      <View style={styles.rule} />
      <Text style={styles.meaning}>{word.meaning}</Text>
      <Text style={styles.festival}>{word.atEvent}</Text>
      <MeanderDivider width={inner} color={colors.primary} style={styles.bottom} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  // A small poster: framed top and bottom by the key, everything on one centered axis.
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
  },
  overline: { ...typeScale.overline, color: colors.textMuted, textAlign: 'center' },
  top: { marginTop: spacing.lg },
  term: {
    ...typeScale.label,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  names: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap' },
  translit: { ...typeScale.title, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.primary },
  english: { ...typeScale.label, color: colors.textMuted },
  rule: { width: 32, height: 2, borderRadius: 1, backgroundColor: colors.accent, marginVertical: spacing.lg },
  meaning: { ...typeScale.body, color: colors.text, textAlign: 'center' },
  festival: { ...typeScale.body, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  bottom: { marginTop: spacing.lg },
}));
