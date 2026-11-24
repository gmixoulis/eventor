import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { FadeInView } from '@/components/fade-in-view';
import { SpeakerRow } from '@/components/directory/rows';
import { ChoiceModal, DirectoryPage, SearchField, useDirectoryStyles } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listSpeakers } from '@/data';

const sorts = [{ value: 'default', label: 'By default' }, { value: 'name', label: 'By name' },
  { value: 'company', label: 'By company' }] as const;

export default function SpeakersScreen() {
  const ds = useDirectoryStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'default' | 'name' | 'company'>('default');
  const [menu, setMenu] = useState(false);
  return (
    <DirectoryPage title="Speakers">
      <FlatList
        data={listSpeakers({ query: query.trim(), sort })}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({ length: 57, offset: 57 * index, index })}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search for speakers" />
          <Pressable accessibilityRole="button" accessibilityLabel="Sort speakers" onPress={() => setMenu(true)} style={styles.sort}>
            <Text style={styles.sortText}>{sorts.find((item) => item.value === sort)?.label}</Text>
            <FontAwesome5 name="chevron-down" size={9} color={colors.textMuted} />
          </Pressable>
        </>}
        ListHeaderComponentStyle={ds.searchWrap}
        renderItem={({ item, index }) => index < 6
          ? <FadeInView index={index}><SpeakerRow speaker={item} /></FadeInView>
          : <SpeakerRow speaker={item} />}
        ListEmptyComponent={<EmptyState icon="account-search-outline" title="No speakers found" />}
      />
      <ChoiceModal visible={menu} onClose={() => setMenu(false)}>
        {sorts.map((item) => (
          <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: sort === item.value }}
            style={ds.choice} onPress={() => { setSort(item.value); setMenu(false); }}>
            <Text style={ds.choiceText}>{item.label}</Text>
          </Pressable>
        ))}
      </ChoiceModal>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  sort: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start',
    paddingTop: spacing.lg, paddingBottom: spacing.xs },
  sortText: { ...typeScale.caption, color: colors.textMuted },
}));
