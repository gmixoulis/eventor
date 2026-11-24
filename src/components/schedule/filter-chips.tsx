import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/chip';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';
import type { Stage } from '@/data/types';

export type FilterKind = 'tracks' | 'tags' | 'speakers';

/** The schedule's stage chips, then Clear filters (first, so it stays in view), My agenda, Side events (unless switched off) and the dropdowns. */
export function FilterChips({ stageOptions, stageId, onStage, myAgenda, onToggleMyAgenda, sideEvents, onToggleSideEvents, counts, onOpenSheet, hasAnyFilter, onClear }: {
  stageOptions: Stage[]; stageId: string | null; onStage: (id: string | null) => void;
  myAgenda: boolean; onToggleMyAgenda: () => void; sideEvents: boolean; onToggleSideEvents?: () => void;
  counts: Record<FilterKind, number>;
  onOpenSheet: (kind: FilterKind) => void; hasAnyFilter: boolean; onClear: () => void;
}) {
  const styles = useStyles();
  return (
    <>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chipsRow}>
      <Chip label="All stages" selected={stageId === null} onPress={() => onStage(null)} />
      {stageOptions.map((st) => (
        <Chip
          key={st.id}
          label={st.name}
          selected={stageId === st.id}
          onPress={() => onStage(st.id)}
        />
      ))}
    </ScrollView>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chipsRow}>
      {hasAnyFilter ? (
        <Chip label="Clear filters" onPress={onClear} />
      ) : null}
      <Chip label="My agenda" selected={myAgenda} onPress={onToggleMyAgenda} />
      {onToggleSideEvents ? <Chip label="Side events" selected={sideEvents} onPress={onToggleSideEvents} /> : null}
      <Chip
        label="Tracks"
        dropdown
        selected={counts.tracks > 0}
        count={counts.tracks || undefined}
        onPress={() => onOpenSheet('tracks')}
      />
      <Chip
        label="Tags"
        dropdown
        selected={counts.tags > 0}
        count={counts.tags || undefined}
        onPress={() => onOpenSheet('tags')}
      />
      <Chip
        label="Speakers"
        dropdown
        selected={counts.speakers > 0}
        count={counts.speakers || undefined}
        onPress={() => onOpenSheet('speakers')}
      />
    </ScrollView>
    </>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
}));
