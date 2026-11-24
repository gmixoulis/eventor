import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { ReelVideo } from '@/components/reels/reel-video';
import { Scrim } from '@/components/reels/scrim';
import { makeStyles, useTheme } from '@/components/theme';
import { motion, radius, spacing, typeScale } from '@/constants/theme';
import { getPerson } from '@/data';
import type { Reel } from '@/data/reels';

const HEART = 96;
const ICON = 64;

type Props = {
  reel: Reel;
  height: number;
  isActive: boolean;
  /** Inside the window of mounted players (current, previous, next). */
  hasPlayer: boolean;
  /** False while the screen is unfocused or the app is in the background. */
  playAllowed: boolean;
  muted: boolean;
  loop: boolean;
  onEnded: () => void;
  liked: boolean;
  saved: boolean;
  likes: number;
  onLike: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  insetTop: number;
  insetBottom: number;
};

export function ReelPage(props: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { reel, height, isActive, hasPlayer, playAllowed, muted, loop, onEnded, liked, saved, likes, insetTop, insetBottom } = props;
  const founder = getPerson(reel.founderId);
  const founderName = founder?.name ?? 'the founder';
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'play' | 'pause'>('pause');

  const iconOpacity = useSharedValue(0);
  const heartX = useSharedValue(0);
  const heartY = useSharedValue(0);
  const heartScale = useSharedValue(0.6);
  const heartOpacity = useSharedValue(0);

  function togglePause() {
    const next = !paused;
    setPaused(next);
    setFlashIcon(next ? 'pause' : 'play');
    if (!reduced) {
      iconOpacity.set(withSequence(withTiming(1, { duration: motion.duration.press }), withDelay(400, withTiming(0, { duration: motion.duration.exit }))));
    }
  }

  function likeAt(x: number, y: number) {
    if (!liked) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    props.onLike();
    if (reduced) return;
    heartX.set(x - HEART / 2);
    heartY.set(y - HEART / 2);
    heartScale.set(0.6);
    heartScale.set(withSpring(1, motion.spring.snap));
    heartOpacity.set(withSequence(withTiming(1, { duration: motion.duration.press }), withDelay(500, withTiming(0, { duration: motion.duration.exit }))));
  }

  // Taps are discrete, so their callbacks run on the JS thread; the animations they start run on the UI thread.
  const singleTap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((_e, success) => {
      if (success) togglePause();
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd((e, success) => {
      if (success) likeAt(e.x, e.y);
    });
  const taps = Gesture.Exclusive(doubleTap, singleTap);

  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.get() }));
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.get(),
    transform: [{ translateX: heartX.get() }, { translateY: heartY.get() }, { scale: heartScale.get() }],
  }));

  const tapLayer = (
    <GestureDetector gesture={taps}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${reel.startup}, pitch by ${founderName}`}
        accessibilityHint={paused ? 'Plays the pitch' : 'Pauses the pitch'}
        accessibilityState={{ selected: !paused }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') togglePause();
        }}
      />
    </GestureDetector>
  );

  const share = () => {
    Share.share({ message: `${reel.startup}: ${reel.pitch}` }).catch(() => {});
  };

  return (
    <View style={[styles.page, { height }]}>
      {hasPlayer ? (
        <ReelVideo
          source={reel.video}
          durationSec={reel.durationSec}
          isActive={isActive}
          shouldPlay={isActive && playAllowed && !paused}
          muted={muted}
          loop={loop}
          onEnded={onEnded}
          progressTop={insetTop + spacing.xs}
          tapLayer={tapLayer}
        />
      ) : (
        tapLayer
      )}

      <Scrim style={styles.scrim} opacity={0.8} />

      <View style={styles.center} pointerEvents="none">
        {reduced ? (
          paused ? <FontAwesome5 name="play" size={ICON / 2} color="white" /> : null
        ) : (
          <Animated.View style={[styles.iconCircle, iconStyle]}>
            <FontAwesome5 name={flashIcon} size={ICON / 2.5} color="white" />
          </Animated.View>
        )}
      </View>
      <Animated.View style={[styles.heart, heartStyle]} pointerEvents="none">
        <FontAwesome5 name="heart" solid size={HEART * 0.8} color="white" />
      </Animated.View>

      {/* Nothing in here is interactive; taps fall through to the video. */}
      <View style={[styles.info, { bottom: insetBottom + spacing.lg }]} pointerEvents="none">
        <Text style={styles.startup}>{reel.startup}</Text>
        <Text style={styles.pitch}>{reel.pitch}</Text>
        <View style={styles.tags}>
          {reel.tags.map((t) => (
            <Text key={t} style={styles.tag}>
              {t}
            </Text>
          ))}
        </View>
        {founder ? (
          <View style={styles.founder}>
            <Avatar name={founder.name} size={28} />
            <View>
              <Text style={styles.founderName}>{founder.name}</Text>
              <Text style={styles.founderRole}>Founder</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.actions, { bottom: insetBottom + spacing.lg }]} pointerEvents="box-none">
        <Action
          icon="heart"
          solid={liked}
          color={liked ? colors.danger : 'white'}
          label={String(likes)}
          a11yLabel={liked ? `Unlike, ${likes} likes` : `Like, ${likes} likes`}
          selected={liked}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            props.onToggleLike();
          }}
        />
        <Action
          icon="bookmark"
          solid={saved}
          color="white"
          label={saved ? 'Saved' : 'Save'}
          a11yLabel={saved ? 'Remove from saved pitches' : 'Save pitch'}
          selected={saved}
          onPress={props.onToggleSave}
        />
        <Action icon="share" solid color="white" label="Share" a11yLabel="Share pitch" onPress={share} />
        <PressableScale
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: reel.founderId } })}
          accessibilityRole="button"
          accessibilityLabel={`Meet the founder, ${founderName}`}
          style={styles.meet}>
          <Text style={styles.meetText}>Meet the founder</Text>
        </PressableScale>
      </View>
    </View>
  );
}

type ActionProps = {
  icon: string;
  solid?: boolean;
  color: string;
  label: string;
  a11yLabel: string;
  selected?: boolean;
  onPress: () => void;
};

function Action({ icon, solid, color, label, a11yLabel, selected, onPress }: ActionProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>
        <FontAwesome5 name={icon} solid={solid} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

// Text and icons over video stay white whatever the light theme does.
const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { width: '100%', backgroundColor: 'black', overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: { position: 'absolute', left: 0, top: 0, width: HEART, height: HEART, alignItems: 'center', justifyContent: 'center' },
  info: { position: 'absolute', left: spacing.lg, right: 96, gap: spacing.sm },
  startup: { ...typeScale.section, color: 'white' },
  pitch: { ...typeScale.body, color: 'white' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    ...typeScale.caption,
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  founder: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  founderName: { ...typeScale.label, color: 'white' },
  founderRole: { ...typeScale.caption, color: 'rgba(255, 255, 255, 0.8)' },
  actions: { position: 'absolute', right: spacing.sm, alignItems: 'center', gap: spacing.md, width: 84 },
  action: { minWidth: 44, minHeight: 44, alignItems: 'center' },
  actionIcon: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...typeScale.caption, color: 'white' },
  pressed: { opacity: 0.6 },
  meet: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetText: { ...typeScale.caption, fontFamily: typeScale.label.fontFamily, color: colors.onPrimary, textAlign: 'center' },
}));
