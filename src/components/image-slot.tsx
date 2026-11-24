import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { makeStyles } from '@/components/theme';
import { motion, radius as radii, spacing, typeScale } from '@/constants/theme';

const FADE_IN = { duration: motion.duration.enter, effect: 'cross-dissolve', skipOnCacheHit: 'memory' } as const;

type Props = {
  source?: ImageProps['source'];
  aspectRatio: number;
  label: string;
  radius?: number;
  position?: 'left' | 'center' | 'right';
  caption?: string;
  /** Ground behind a loaded image (shows through transparent PNGs). Defaults to the skeleton tint. */
  background?: string;
};

export function ImageSlot({
  source,
  aspectRatio,
  label,
  radius = radii.sm,
  position = 'center',
  caption,
  background,
}: Props) {
  const styles = useStyles();
  const [failed, setFailed] = useState(false);

  if (source && !failed) {
    return (
      <View style={[styles.frame, { aspectRatio, borderRadius: radius }, background ? { backgroundColor: background } : null]}>
        <Image
          source={source}
          contentFit="cover"
          contentPosition={position}
          transition={FADE_IN}
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
        />
        {caption ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="captionFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="0.72" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="50%" width="100%" height="50%" fill="url(#captionFade)" />
            </Svg>
            <Text style={styles.caption}>{caption}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.placeholder, { aspectRatio, borderRadius: radius }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: colors.skeleton,
    overflow: 'hidden',
  },
  placeholder: {
    width: '100%',
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  caption: {
    ...typeScale.section,
    color: '#FFFFFF',
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
}));
