import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PersonRow, SessionRow, SpeakerRow } from '@/components/directory/rows';
import { DirectoryPage, SearchField, useDirectoryStyles } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { withoutHidden } from '@/components/matching/match-filters.helpers';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { search } from '@/data';
import { isPathEnabled } from '@/lib/features';
import { useFeatures, useMatchFeedback } from '@/store';

const categories = [
  { label: 'People', icon: 'users', href: '/people' },
  { label: 'Schedule', icon: 'calendar-alt', href: '/schedule' },
  { label: 'Speakers', icon: 'microphone', href: '/speakers' },
  { label: 'Sponsors', icon: 'handshake', href: '/sponsors' },
] as const;

export default function SearchScreen() {
  const ds = useDirectoryStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const { hidden } = useMatchFeedback();
  const { flags } = useFeatures();
  const found = search(query.trim());
  // A switched-off feature has neither a category nor results here.
  const results = {
    people: flags.people ? withoutHidden(found.people, hidden) : [],
    sessions: flags.schedule ? found.sessions : [],
    speakers: flags.speakers ? found.speakers : [],
    sponsors: flags.sponsors ? found.sponsors : [],
  };
  const hasResults = Object.values(results).some((group) => group.length > 0);
  return (
    <DirectoryPage title="Search" background={colors.bg}>
      <View style={ds.searchWrap}><SearchField value={query} onChangeText={setQuery} placeholder="Search" autoFocus /></View>
      <ScrollView keyboardShouldPersistTaps="handled">
        {!query.trim() ? (
          <View style={styles.categories}>
            <Text style={styles.heading} accessibilityRole="header">Categories</Text>
            {categories.filter((category) => isPathEnabled(category.href, flags)).map((category) => (
              <Pressable key={category.label} accessibilityLabel={category.label} style={styles.category} accessibilityRole="link"
                onPress={() => router.push(category.href)}>
                <FontAwesome5 name={category.icon} size={16} color={colors.textMuted} style={styles.icon} />
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : !hasResults ? <EmptyState icon="magnify" title="Nothing found" /> : <>
          {results.people.length ? <>
            <Text style={styles.groupHeading} accessibilityRole="header">People</Text>
            {results.people.slice(0, 5).map((person) => <PersonRow key={person.id} person={person} />)}
          </> : null}
          {results.sessions.length ? <>
            <Text style={styles.groupHeading} accessibilityRole="header">Schedule</Text>
            {results.sessions.slice(0, 5).map((session) => <SessionRow key={session.id} session={session} />)}
          </> : null}
          {results.speakers.length ? <>
            <Text style={styles.groupHeading} accessibilityRole="header">Speakers</Text>
            {results.speakers.slice(0, 5).map((speaker) => <SpeakerRow key={speaker.id} speaker={speaker} />)}
          </> : null}
          {results.sponsors.length ? <>
            <Text style={styles.groupHeading} accessibilityRole="header">Sponsors</Text>
            {results.sponsors.slice(0, 5).map((sponsor) => (
              <Pressable key={sponsor.id} accessibilityLabel={sponsor.name} style={styles.sponsor} accessibilityRole="button"
                onPress={() => router.push(`/sponsor/${sponsor.id}`)}>
                <Avatar name={sponsor.name} uri={sponsor.logo} size={46} shape="square" fit="contain" />
                <Text style={[ds.label, ds.grow]}>{sponsor.name}</Text>
              </Pressable>
            ))}
          </> : null}
        </>}
      </ScrollView>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  categories: { paddingTop: spacing.sm },
  heading: { ...typeScale.section, color: colors.text, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  category: { minHeight: 52, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  categoryLabel: { ...typeScale.label, color: colors.text },
  icon: { width: 20, textAlign: 'center' },
  groupHeading: { ...typeScale.section, color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  sponsor: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
}));
