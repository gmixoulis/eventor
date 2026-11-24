import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ChoiceModal, SearchField, useDirectoryStyles } from '@/components/directory/ui';
import { hasHubFilters, type HubFilters } from '@/components/side-events/hub-math';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';
import { getEvent, listSideEventCategories } from '@/data';
import { formatShortDay } from '@/lib/format';

const days = getEvent().days;

/** Search, then one chip row: Clear filters (when any), days, category and "Has room". */
export function HubFilterBar({ filters, onChange, onClear }: {
  filters: HubFilters; onChange: (next: HubFilters) => void; onClear: () => void;
}) {
  const styles = useStyles();
  const ds = useDirectoryStyles();
  const [menu, setMenu] = useState(false);
  const set = (patch: Partial<HubFilters>) => onChange({ ...filters, ...patch });
  const pickCategory = (category: HubFilters['category']) => {
    set({ category });
    setMenu(false);
  };

  return (
    <View>
      <View style={styles.search}>
        <SearchField value={filters.query} onChangeText={(query) => set({ query })} placeholder="Search side events" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
        {hasHubFilters(filters) ? <Chip label="Clear filters" onPress={onClear} /> : null}
        <Chip label="All days" selected={filters.day === null} onPress={() => set({ day: null })} />
        {days.map((day) => (
          <Chip key={day} label={formatShortDay(day)} selected={filters.day === day} onPress={() => set({ day })} />
        ))}
        <Chip
          label={filters.category ?? 'Category'}
          dropdown
          selected={filters.category !== null}
          accessibilityLabel={`Category, ${filters.category ?? 'any'}`}
          onPress={() => setMenu(true)}
        />
        <Chip label="Has room" selected={filters.hasRoom} onPress={() => set({ hasRoom: !filters.hasRoom })} />
      </ScrollView>

      <ChoiceModal visible={menu} onClose={() => setMenu(false)} title="Category">
        {[null, ...listSideEventCategories()].map((category) => (
          <Pressable
            key={category ?? 'any'}
            accessibilityRole="radio"
            accessibilityLabel={category ?? 'Any category'}
            accessibilityState={{ checked: filters.category === category }}
            style={[ds.choice, styles.choice]}
            onPress={() => pickCategory(category)}>
            <Text style={ds.choiceText}>{category ?? 'Any category'}</Text>
          </Pressable>
        ))}
      </ChoiceModal>
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    search: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    scroll: { flexGrow: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    choice: { height: 44 },
  }),
);
