import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { SponsorCard } from '@/components/directory/sponsor-card';
import { ChoiceModal, DirectoryPage, SearchField, useDirectoryStyles } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getSponsor, listSponsors } from '@/data';
import { useSponsorRecommendations } from '@/matching/use-sponsors';
import { useProfile, useSession } from '@/store';

export default function SponsorsScreen() {
  const ds = useDirectoryStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [tierId, setTierId] = useState<string>();
  const [categories, setCategories] = useState(false);
  const { isGuest } = useSession();
  const { profile } = useProfile();
  const recommended = useSponsorRecommendations();
  const tiers = listSponsors();
  const filtered = listSponsors({ tierId }).map((tier) => ({
    ...tier, data: tier.sponsors.filter((sponsor) => sponsor.name.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter((tier) => tier.data.length > 0);
  const choices = [{ id: undefined, name: 'All categories' }, ...tiers];
  const showRecommended = !isGuest && profile.selections.length > 0 && recommended.length > 0;
  const recommendedCards = recommended.flatMap((score) => {
    const sponsor = getSponsor(score.sponsorId);
    return sponsor ? [{ sponsor, reason: score.reasons[0] }] : [];
  });
  return (
    <DirectoryPage title="Sponsors" background={colors.bg}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Search sponsors" accessibilityState={{ expanded: searching }}
          style={styles.searchButton} onPress={() => { setSearching(!searching); setQuery(''); }}>
          <FontAwesome5 name={searching ? 'times' : 'search'} size={14} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setCategories(true)} style={styles.dropdown}>
          <Text numberOfLines={1} style={styles.dropdownText}>{tiers.find((tier) => tier.id === tierId)?.name ?? 'All categories'}</Text>
          <FontAwesome5 name="chevron-down" size={12} color={colors.textMuted} />
        </Pressable>
      </View>
      {searching ? <View style={ds.searchWrap}><SearchField value={query} onChangeText={setQuery} placeholder="Search for sponsors" autoFocus /></View> : null}
      <SectionList sections={filtered} keyExtractor={(item) => item.id} stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={showRecommended ? (
          <View style={styles.recommended}>
            <Text style={styles.recommendedHeading} accessibilityRole="header">Recommended for you</Text>
            {recommendedCards.map((entry) => (
              <SponsorCard key={entry.sponsor.id} sponsor={entry.sponsor} reason={entry.reason} />
            ))}
          </View>
        ) : undefined}
        renderSectionHeader={({ section }) => <Text style={styles.heading}>{section.name}</Text>}
        renderItem={({ item }) => <SponsorCard sponsor={item} />}
        ListEmptyComponent={<EmptyState icon="storefront-outline" title="No sponsors found" />}
      />
      <ChoiceModal visible={categories} onClose={() => setCategories(false)} title="Select a category" sheet>
        {choices.map((tier) => (
          <Pressable key={tier.id ?? 'all'} style={ds.choice} accessibilityRole="radio"
            accessibilityState={{ checked: tierId === tier.id }} onPress={() => { setTierId(tier.id); setCategories(false); }}>
            <Text style={ds.choiceText}>{tier.name}</Text>
          </Pressable>
        ))}
      </ChoiceModal>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, padding: spacing.md },
  searchButton: { width: 32, height: 32, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center' },
  dropdown: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  dropdownText: { ...typeScale.label, color: colors.text, flex: 1 },
  heading: { ...typeScale.section, color: colors.text, paddingTop: spacing.xl, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
  recommended: { paddingTop: spacing.lg },
  recommendedHeading: { ...typeScale.section, color: colors.text, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
}));
