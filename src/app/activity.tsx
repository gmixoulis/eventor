import { FontAwesome5 } from '@expo/vector-icons';
import { useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { activityBody } from '@/components/home/format';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { useActivity, useEventName, useSettings, type ActivityItem } from '@/store';

export default function ActivityScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { items } = useActivity();
  const { use24h } = useSettings();
  const eventName = useEventName();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<ActivityItem>>(null);
  const spin = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // The store is live, so refresh only needs to bring the newest item back into view.
  const refresh = () => {
    spin.set(withTiming(spin.get() + 360, { duration: 600 }));
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Activity history</Text>
        <Pressable
          onPress={refresh}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Refresh activity">
          <Animated.View style={spinStyle}>
            <FontAwesome5 name="sync-alt" size={16} color={colors.text} />
          </Animated.View>
        </Pressable>
      </View>

      <FlatList
        ref={list}
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <EmptyState illustrated icon="bell-outline" title="No activity yet" body="Announcements and meeting updates will show up here." />
        }
        renderItem={({ item }) => {
          const body = activityBody(item, use24h, eventName);
          return (
          <View style={styles.row}>
            <View style={styles.icon}>
              <FontAwesome5
                name={item.kind === 'announcement' ? 'bullhorn' : 'comments'}
                size={18}
                color={colors.textMuted}
              />
            </View>
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {body ? (
                <Text style={styles.body} numberOfLines={3}>
                  {body}
                </Text>
              ) : null}
              <Text style={styles.date}>{formatDateTime(item.date, use24h)}</Text>
            </View>
          </View>
          );
        }}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  heading: { ...typeScale.section, color: colors.text },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', padding: spacing.lg, gap: spacing.md },
  icon: { width: 24, alignItems: 'center', paddingTop: 2 },
  text: { flex: 1, gap: spacing.xs },
  title: { ...typeScale.label, color: colors.text },
  body: { ...typeScale.caption, color: colors.text },
  date: { ...typeScale.caption, color: colors.textMuted },
}));
