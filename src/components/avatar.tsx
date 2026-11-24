import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { IdentitySpec } from '@/art/identity';
import { IdentityPattern } from '@/components/art/identity-pattern';
import { makeStyles, useTheme } from '@/components/theme';
import { motion, typeScale } from '@/constants/theme';

// Fade over the placeholder color; cached avatars show instantly instead of re-fading on every scroll.
const FADE_IN = { duration: motion.duration.enter, effect: 'cross-dissolve', skipOnCacheHit: 'memory' } as const;

type Props = {
  uri?: string;
  name: string;
  size: number;
  shape?: 'circle' | 'square';
  /** Corner radius for the square shape. */
  radius?: number;
  fit?: 'cover' | 'contain';
  /** Without a photo, the person's identity mark becomes a quiet ground around the initials. */
  pattern?: IdentitySpec;
};

export function Avatar({ uri, name, size, shape = 'circle', radius = 4, fit = 'cover', pattern }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const radiusValue = shape === 'circle' ? size / 2 : radius;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        contentFit={fit}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        transition={FADE_IN}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radiusValue,
            backgroundColor: fit === 'contain' ? colors.card : colors.skeleton,
          },
          fit === 'contain' && styles.containBorder,
        ]}
      />
    );
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (pattern) {
    // The mark rings the edge at reduced strength; a plain medallion keeps the initials crisp.
    const core = Math.round(size * 0.62);
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: radiusValue, overflow: 'hidden' }]}>
        <View style={styles.quiet} accessible={false} importantForAccessibility="no-hide-descendants">
          <IdentityPattern spec={pattern} size={size} shape={shape} />
        </View>
        <View style={[styles.core, { width: core, height: core, borderRadius: core / 2 }]} />
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.3), lineHeight: Math.round(size * 0.38) }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: radiusValue },
      ]}>
      <Text
        style={[
          styles.initials,
          { fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) },
        ]}>
        {initials}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quiet: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
  core: { position: 'absolute', backgroundColor: colors.primarySoft },
  initials: {
    ...typeScale.label,
    color: colors.primary,
  },
  containBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));
