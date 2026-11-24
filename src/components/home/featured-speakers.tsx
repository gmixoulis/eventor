import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FadeInView } from '@/components/fade-in-view';
import { Avatar } from '@/components/avatar';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { listSpeakers } from '@/data';

export function FeaturedSpeakers() {
  const styles = useStyles();
  const { colors } = useTheme();
  const speakers = listSpeakers().filter((s) => s.featured);

  return (
    <FadeInView index={4}>
      <FlatList
        horizontal
        data={speakers}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View speaker ${item.name}`}
            onPress={() => router.push({ pathname: '/speaker/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <Avatar uri={item.photo} name={item.name} size={94} />
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.title} • {item.company}
            </Text>
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="See all speakers"
            onPress={() => router.push('/speakers')}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
              <FontAwesome5 name="arrow-right" size={11} color={colors.primary} />
            </View>
          </Pressable>
        }
      />
    </FadeInView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    width: 132,
    height: 170,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.7 },
  name: {
    ...typeScale.label,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  meta: {
    ...typeScale.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seeAllText: {
    ...typeScale.label,
    color: colors.primary,
  },
}));
