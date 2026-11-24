import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer, type VideoSource } from 'expo-video';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { radius, spacing, typeScale } from '@/constants/theme';

/** expo-video emits time on the JS thread; 4 events a second, smoothed into a linear tween on the UI thread. */
const TICK_S = 0.25;

type Props = {
  source: VideoSource;
  durationSec: number;
  isActive: boolean;
  shouldPlay: boolean;
  muted: boolean;
  loop: boolean;
  onEnded: () => void;
  progressTop: number;
  /** The tap surface; rendered above the video and below the spinner and error card. */
  tapLayer: ReactNode;
};

/** Players are native objects driven by property writes; the helper keeps the compiler's hook-value rule out of the way. */
export function setPlayer(player: VideoPlayer, patch: Partial<Pick<VideoPlayer, 'muted' | 'loop' | 'currentTime'>>) {
  Object.assign(player, patch);
}

/** One player for one page. Unmounting this component releases the player. */
export function ReelVideo({ source, durationSec, isActive, shouldPlay, muted, loop, onEnded, progressTop, tapLayer }: Props) {
  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = TICK_S;
    p.muted = muted;
    p.loop = loop;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const progress = useSharedValue(0);

  useEffect(() => {
    setPlayer(player, { muted, loop });
  }, [player, muted, loop]);

  // `status` is a dependency so a retried source starts again once it is ready.
  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [player, shouldPlay, status]);

  // A page that leaves the screen starts from the beginning next time.
  useEffect(() => {
    if (!isActive) {
      setPlayer(player, { currentTime: 0 });
      progress.set(0);
    }
  }, [player, isActive, progress]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const total = player.duration > 0 ? player.duration : durationSec;
    progress.set(withTiming(Math.min(1, currentTime / total), { duration: TICK_S * 1000, easing: Easing.linear }));
  });

  useEventListener(player, 'playToEnd', () => {
    if (!loop) onEnded();
  });

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <>
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        surfaceType="textureView"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {tapLayer}
      <View style={[styles.track, { top: progressTop }]} pointerEvents="none">
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      {status === 'loading' ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color="white" size="large" accessibilityLabel="Loading pitch" />
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.errorCard}>
            <Text style={styles.errorText} accessibilityRole="alert">
              This pitch could not be played
            </Text>
            <Button label="Retry" variant="outline" onPress={() => void player.replaceAsync(source)} />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'white' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  errorCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  errorText: { ...typeScale.body, color: 'white', textAlign: 'center' },
});
