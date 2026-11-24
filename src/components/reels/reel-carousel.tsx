import { FontAwesome5 } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FadeInView } from '@/components/fade-in-view';
import { PressableScale } from '@/components/pressable-scale';
import { activeIndex, clipLength } from '@/components/reels/helpers';
import { Scrim } from '@/components/reels/scrim';
import { useAppActive } from '@/components/reels/use-reel-reactions';
import { makeStyles } from '@/components/theme';
import { motion, radius, spacing, typeScale } from '@/constants/theme';
import { getPerson } from '@/data';
import { listReels, type Reel } from '@/data/reels';

const CARD_W = 132;
const CARD_H = 220;
const GAP = 10;
const STEP = CARD_W + GAP;

export function openReel(id: string) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  router.push(`/reels?id=${id}`);
}

/** Section header with a "See all" link that opens the viewer at the first reel. */
export function ReelSectionHeader({ title }: { title: string }) {
  const styles = useStyles();
  const first = listReels()[0];
  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {first ? (
        <Pressable
          onPress={() => openReel(first.id)}
          hitSlop={12}
          accessibilityRole="link"
          accessibilityLabel="See all startup pitches"
          style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Horizontal pitch cards; only the card nearest the left edge plays, muted and looping. */
export function ReelCarousel() {
  const styles = useStyles();
  const reels = listReels();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<{ player: VideoPlayer; id: string } | null>(null);
  const enabled = focused && appActive;
  const reel = reels[active];

  return (
    <FadeInView index={3}>
      {enabled && reel ? <CarouselPlayback reel={reel} onReady={setLoaded} /> : null}
      <FlatList
        horizontal
        data={reels}
        keyExtractor={(r) => r.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={STEP}
        decelerationRate="fast"
        scrollEventThrottle={32}
        // React skips the render when the index is unchanged, so this re-renders only on a card change.
        onScroll={({ nativeEvent: e }) => setActive(activeIndex(
          e.contentOffset.x, STEP, reels.length, e.layoutMeasurement.width, e.contentSize.width,
        ))}
        renderItem={({ item, index }) => (
          <ReelCard reel={item}>
            {enabled && index === active && loaded?.id === item.id ? (
              <CarouselVideo key={item.id} player={loaded.player} />
            ) : null}
          </ReelCard>
        )}
      />
    </FadeInView>
  );
}

/** Mount only in the foreground on Home; the hook releases its player on unmount. */
function CarouselPlayback({ reel, onReady }: {
  reel: Reel;
  onReady: (loaded: { player: VideoPlayer; id: string } | null) => void;
}) {
  const player = useVideoPlayer(null, (p) => {
    p.muted = true;
    p.loop = true;
  });
  const replacements = useRef(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    // Serialize replacements so a slower, older clip cannot overwrite the latest selection.
    replacements.current = replacements.current.then(async () => {
      if (cancelled) return;
      player.pause();
      await player.replaceAsync(reel.video);
      if (cancelled) return;
      onReady({ player, id: reel.id });
      player.play();
    }).catch(() => {
      // A failed preview leaves its poster visible; the full viewer offers retry.
    });
    return () => {
      cancelled = true;
      player.pause();
      onReady(null);
    };
  }, [player, reel, onReady]);
  return null;
}

function CarouselVideo({ player }: { player: VideoPlayer }) {
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const [firstFrame, setFirstFrame] = useState(false);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
      opacity: isPlaying && firstFrame ? 1 : 0,
      transitionProperty: 'opacity',
      transitionDuration: motion.duration.fast,
    }]}>
      <VideoView player={player} nativeControls={false} contentFit="cover" surfaceType="textureView"
        onFirstFrameRender={() => setFirstFrame(true)} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function ReelCard({ reel, children }: { reel: Reel; children: ReactNode }) {
  const styles = useStyles();
  const founder = getPerson(reel.founderId);

  return (
    <PressableScale
      onPress={() => openReel(reel.id)}
      accessibilityRole="button"
      accessibilityLabel={`${reel.startup}, pitch by ${founder?.name ?? 'the founder'}, ${clipLength(reel.durationSec)}`}
      accessibilityHint="Opens the pitch full screen"
      style={styles.card}>
      <Image source={reel.poster} contentFit="cover" style={StyleSheet.absoluteFill} />
      {children}
      <Scrim style={styles.scrim} />
      <View style={styles.top} pointerEvents="none">
        <View style={styles.play}>
          <FontAwesome5 name="play" size={9} color="white" style={styles.playIcon} />
        </View>
        <Text style={styles.duration}>{clipLength(reel.durationSec)}</Text>
      </View>
      <View style={styles.bottom} pointerEvents="none">
        <Text style={styles.startup} numberOfLines={1}>
          {reel.startup}
        </Text>
        {founder ? (
          <Text style={styles.founder} numberOfLines={1}>
            {founder.name}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

// Text over video stays white whatever the light theme does.
const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: { ...typeScale.section, color: colors.text },
  seeAll: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  seeAllText: { ...typeScale.label, color: colors.primary },
  list: { paddingHorizontal: spacing.lg, gap: GAP },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: CARD_H * 0.55 },
  top: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  play: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { marginLeft: 1 },
  duration: {
    ...typeScale.caption,
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: radius.xs,
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
  },
  bottom: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm },
  startup: { ...typeScale.label, color: 'white' },
  founder: { ...typeScale.caption, color: 'rgba(255, 255, 255, 0.8)' },
}));
