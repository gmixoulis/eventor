import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DirectoryPage, SearchField } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { FadeInView } from '@/components/fade-in-view';
import { MatchCard } from '@/components/matching/match-card';
import { matchFilterGroups, sortLabels, sortPeople, type PeopleSort } from '@/components/matching/match-filters.helpers';
import { useMatches } from '@/components/matching/use-matches';
import { PressableScale } from '@/components/pressable-scale';
import { FilterSheet } from '@/components/schedule/filter-sheet';
import { Sheet } from '@/components/sheet';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listPeople } from '@/data';
import type { Person } from '@/data/types';
import { useMatchFeedback, useProfile } from '@/store';

type Undo = { person: Person; index: number; until: number };

export default function PeopleScreen() {
  const styles = useStyles();
  const { profile } = useProfile();
  const { matches, byPerson, ready } = useMatches();
  const feedback = useMatchFeedback();
  const { hide, unhide, hidden, bookmarked } = feedback;
  const focused = useIsFocused();
  const impressed = useRef(false);
  const [tab, setTab] = useState<'matches' | 'all'>('matches');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PeopleSort>('best');
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [sheet, setSheet] = useState<'sort' | 'interest' | 'goal' | null>(null);
  const [undos, setUndos] = useState<Undo[]>([]);
  const showMatches = profile.networking && tab === 'matches';
  const filtered = listPeople(query.trim(), { interestIds, goalIds })
    .filter((person) => !hidden.includes(person.id) && !profile.blocked.includes(person.id)
      && (!onlyBookmarked || bookmarked.includes(person.id)));
  const people = showMatches
    ? matches.filter((match) => match.tier === 'top')
        .flatMap((match) => filtered.filter((person) => person.id === match.personId))
    : sortPeople(filtered, sort, byPerson);
  const rows = people.map((person) => ({ person, hidden: false }));
  for (const undo of [...undos].sort((a, b) => a.index - b.index)) {
    if (hidden.includes(undo.person.id)) rows.splice(Math.min(undo.index, rows.length), 0, { person: undo.person, hidden: true });
  }
  const filtersActive = interestIds.length > 0 || goalIds.length > 0 || onlyBookmarked;

  useEffect(() => {
    if (!focused || !showMatches) {
      impressed.current = false;
    } else if (ready && !impressed.current) {
      impressed.current = true;
      feedback.impress(people.slice(0, 10).map((person) => person.id));
    }
  }, [focused, showMatches, ready, feedback, people]);

  useEffect(() => {
    if (!undos.length) return;
    const timer = setTimeout(() => setUndos((items) => items.filter((item) => item.until > Date.now())),
      Math.max(0, Math.min(...undos.map((item) => item.until)) - Date.now()));
    return () => clearTimeout(timer);
  }, [undos]);

  return (
    <DirectoryPage title="People">
      {profile.networking ? (
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['matches', 'all'] as const).map((key) => (
            <PressableScale key={key} style={styles.tab} feedback="highlight" accessibilityRole="tab"
              accessibilityLabel={key === 'matches' ? 'Your matches' : 'All attendees'}
              accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)}>
              <Text style={[styles.tabText, tab === key && styles.active]}>{key === 'matches' ? 'Your matches' : 'All attendees'}</Text>
              {tab === key ? <View style={styles.underline} /> : null}
            </PressableScale>
          ))}
        </View>
      ) : <Text style={styles.notice}>Networking is off. Turn it on in Account to see matches.</Text>}
      <View style={styles.search}><SearchField value={query} onChangeText={setQuery} placeholder="Search for people" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.chips}>
        {!showMatches ? <Chip label={`Sort: ${sortLabels[sort]}`} dropdown onPress={() => setSheet('sort')} /> : null}
        <Chip label="Interest" selected={interestIds.length > 0} count={interestIds.length || undefined} dropdown onPress={() => setSheet('interest')} />
        <Chip label="Goal" selected={goalIds.length > 0} count={goalIds.length || undefined} dropdown onPress={() => setSheet('goal')} />
        <Chip label="Bookmarked" selected={onlyBookmarked} onPress={() => setOnlyBookmarked(!onlyBookmarked)} />
        {filtersActive ? <Chip label="Clear filters" onPress={() => { setInterestIds([]); setGoalIds([]); setOnlyBookmarked(false); }} /> : null}
      </ScrollView>
      <FlatList data={rows} keyExtractor={(item) => item.person.id} keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const card = item.hidden ? (
            <View style={styles.undo} accessibilityLiveRegion="polite">
              <Text style={styles.caption}>Hidden.</Text>
              <Button label="Undo" accessibilityLabel={`Undo hiding ${item.person.name}`} variant="ghost" onPress={() => {
                unhide(item.person.id);
                setUndos((items) => items.filter((undo) => undo.person.id !== item.person.id));
              }} />
            </View>
          ) : <MatchCard person={item.person} match={byPerson[item.person.id]} onHide={() => {
            setUndos((items) => [...items.filter((undo) => undo.person.id !== item.person.id),
              { person: item.person, index, until: Date.now() + 5000 }]);
            hide(item.person.id);
          }} />;
          return index < 6 ? <FadeInView index={index}>{card}</FadeInView> : card;
        }}
        ListEmptyComponent={showMatches ? (
          !ready ? <Text style={styles.notice}>Finding your matches...</Text> : (
            <View style={styles.empty}>
              <EmptyState illustrated icon="account-search-outline" title="No matches yet" body="Select interests and goals to get matched." />
              <Button label="Edit my interests" accessibilityLabel="Edit my interests" onPress={() => router.push('/account/interests')} />
            </View>
          )
        ) : <EmptyState icon="account-search-outline" title="No people found" />}
      />
      {sheet === 'sort' ? (
        <Sheet visible title="Sort by" onClose={() => setSheet(null)}>
          {(['best', 'name', 'company'] as const).map((key) => (
            <PressableScale key={key} style={styles.sortOption} feedback="highlight" accessibilityRole="radio"
              accessibilityLabel={sortLabels[key]} accessibilityState={{ checked: sort === key }}
              onPress={() => { setSort(key); setSheet(null); }}>
              <Text style={[styles.sortText, sort === key && styles.active]}>{sortLabels[key]}</Text>
            </PressableScale>
          ))}
        </Sheet>
      ) : sheet ? <FilterSheet key={sheet} visible title={sheet === 'interest' ? 'Interest' : 'Goal'}
        groups={matchFilterGroups(sheet)} selected={sheet === 'interest' ? interestIds : goalIds}
        onDone={sheet === 'interest' ? setInterestIds : setGoalIds} onClose={() => setSheet(null)} /> : null}
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  tabText: { ...typeScale.label, color: colors.textMuted },
  active: { color: colors.primary },
  underline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: colors.primary },
  search: { padding: spacing.md },
  filters: { flexGrow: 0, height: 52 },
  chips: { paddingHorizontal: spacing.md, alignItems: 'center', gap: spacing.sm },
  notice: { ...typeScale.caption, color: colors.textMuted, padding: spacing.lg },
  caption: { ...typeScale.caption, color: colors.textMuted },
  undo: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  empty: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  sortOption: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.md, backgroundColor: colors.card },
  sortText: { ...typeScale.body, color: colors.text },
}));
