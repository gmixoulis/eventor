import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

/**
 * The status mark: Live, Full, Ended, Pending, waitlist. Not for types, directions or reasons;
 * those are plain text. Soft tones are a tint with its own text color; `neutral` is ink on
 * grey, since blue is for actions only.
 * Every text and ground pair here is in the contrast test.
 */
export type PillTone =
  | 'muted'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'outline'
  | 'ink'
  | 'accentSolid';

export function Pill({ label, tone = 'muted', icon }: { label: string; tone?: PillTone; icon?: ReactNode }) {
  const styles = useStyles();
  const t = styles[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.backgroundColor, borderColor: t.borderColor }]}>
      {icon}
      <Text style={[styles.text, { color: t.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type Tone = { backgroundColor: string; borderColor: string; color: string };

const useStyles = makeStyles(({ colors }) => {
  const soft = (bg: string, fg: string): Tone => ({ backgroundColor: bg, borderColor: bg, color: fg });
  const tones: Record<PillTone, Tone> = {
    muted: soft(colors.highlight, colors.textMuted),
    neutral: soft(colors.highlight, colors.text),
    success: soft(colors.successSoft, colors.success),
    warning: soft(colors.warningSoft, colors.warning),
    danger: soft(colors.dangerSoft, colors.danger),
    accent: soft(colors.accentSoft, colors.onAccentSoft),
    outline: { backgroundColor: 'transparent', borderColor: colors.border, color: colors.textMuted },
    ink: soft(colors.text, colors.bg),
    accentSolid: soft(colors.artYellow, colors.onArt),
  };
  return {
    ...tones,
    ...StyleSheet.create({
      pill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 22,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.xs,
        borderWidth: StyleSheet.hairlineWidth,
      },
      text: { ...typeScale.caption, fontSize: 11, lineHeight: 14 },
    }),
  };
});
