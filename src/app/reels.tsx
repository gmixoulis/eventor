import { FontAwesome5 } from '@expo/vector-icons';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeIndex, inPlayerWindow } from '@/components/reels/helpers';
import { ReelPage } from '@/components/reels/reel-page';
import { useAppActive, useReelReactions } from '@/components/reels/use-reel-reactions';
import { spacing } from '@/constants/theme';
import { listReels, type Reel } from '@/data/reels';

/** Full-screen vertical pager of startup pitch reels. Opened as /reels?id=<reel id>. */
export default function ReelsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const reels = listReels();
  const startIndex = Math.max(0, reels.findIndex((r) => r.id === id));
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const reactions = useReelReactions();
  const listRef = useRef<FlatList<Reel>>(null);

  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(startIndex);
  // Muted by default: people open apps in public. Lasts while the viewer is open.
  const [muted, setMuted] = useState(true);

  const advance = (from: number) => {
    const next = from + 1;
    if (next >= reels.length) return;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setActive(next);
  };

  return (
    <GestureHandlerRootView style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />

      {height > 0 ? (
        <FlatList
          ref={listRef}
          data={reels}
          keyExtractor={(r) => r.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          extraData={{ active, muted, focused, appActive, reactions }}
          onMomentumScrollEnd={(e) =>
            setActive(activeIndex(e.nativeEvent.contentOffset.y, height, reels.length))
          }
          renderItem={({ item, index }) => (
            <ReelPage
              reel={item}
              height={height}
              isActive={index === active}
              hasPlayer={inPlayerWindow(index, active, reels.length)}
              playAllowed={focused && appActive}
              muted={muted}
              loop={index === reels.length - 1}
              onEnded={() => advance(index)}
              liked={reactions.isLiked(item.id)}
              saved={reactions.isSaved(item.id)}
              likes={reactions.likeCount(item.id)}
              onLike={() => reactions.like(item.id)}
              onToggleLike={() => reactions.toggleLike(item.id)}
              onToggleSave={() => reactions.toggleSave(item.id)}
              insetTop={insets.top}
              insetBottom={insets.bottom}
            />
          )}
        />
      ) : null}

      <View style={[styles.topBar, { top: insets.top + spacing.md }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close pitches"
          style={styles.topButton}>
          <FontAwesome5 name="times" size={22} color="white" />
        </Pressable>
        <Pressable
          onPress={() => setMuted((m) => !m)}
          accessibilityRole="switch"
          accessibilityLabel="Sound"
          accessibilityState={{ checked: !muted }}
          style={styles.topButton}>
          <FontAwesome5 name={muted ? 'volume-mute' : 'volume-up'} size={20} color="white" />
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'black' },
  topBar: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
