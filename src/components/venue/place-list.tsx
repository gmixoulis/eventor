import { FontAwesome5 } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { makeStyles, useTheme } from '@/components/theme';
import { CrowdDot, crowdLabel } from '@/components/venue/crowd';
import { crowdLevel } from '@/components/venue/crowd-demo';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { Place } from '@/data/types';

/** The venue map's list mode. `hidden` keeps it out of the accessibility tree under the place sheet. */
export function PlaceList({ places, hidden, bottomInset, onSelect }: {
  places: Place[]; hidden: boolean; bottomInset: number; onSelect: (place: Place) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.listPanel} accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}>
      <FlatList data={places} keyExtractor={(place) => place.id} keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.listContent, { paddingBottom: 76 + bottomInset }, places.length === 0 && styles.emptyList]}
        ListEmptyComponent={<EmptyState icon="map-marker-outline" title="No items to show" />}
        renderItem={({ item }) => {
          const level = crowdLevel(item.id);
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}${level ? `, ${crowdLabel(level)}` : ''}`}
              onPress={() => onSelect(item)} style={styles.placeRow}>
              <View style={styles.placeIcon}><FontAwesome5 name="map-marker-alt" size={14} color={colors.primary} /></View>
              <View style={styles.copy}>
                <Text style={styles.label} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.caption} numberOfLines={1}>{item.description}</Text>
              </View>
              {level ? <CrowdDot level={level} /> : null}
            </Pressable>
          );
        }} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  listPanel: { position: 'absolute', top: 108, bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, backgroundColor: colors.card, overflow: 'hidden' },
  listContent: { flexGrow: 1 },
  emptyList: { justifyContent: 'center', alignItems: 'center' },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  placeIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xs },
  label: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
}));
