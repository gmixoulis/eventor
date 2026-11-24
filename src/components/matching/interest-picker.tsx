import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SearchField } from '@/components/directory/ui';
import { GoalSheet } from '@/components/matching/goal-sheet';
import {
  filterGroups,
  goalOf,
  goalTag,
  removeInterest,
  setGoal,
  tapAction,
} from '@/components/matching/goals';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { listInterestGroups } from '@/data';
import type { Interest, Selection } from '@/data/types';

type Props = {
  selections: Selection[];
  /** Called with the full next list; the caller may refuse it (e.g. removing the last interest). */
  onChange: (next: Selection[]) => void;
};

// The chip is 32 tall; the hit slop brings the target to 44.
const SLOP = { top: 6, bottom: 6, left: 2, right: 2 };

/** Search plus grouped interest chips. Render inside a ScrollView; it does not scroll itself. */
export function InterestPicker({ selections, onChange }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Interest | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const groups = filterGroups(listInterestGroups(), query);

  const press = (interest: Interest) => {
    const action = tapAction(interest, goalOf(selections, interest.id) !== undefined);
    if (action === 'open-sheet') {
      setEditing(interest);
      setSheetOpen(true);
    } else if (action === 'toggle-on') {
      onChange(setGoal(selections, interest.id, 'network'));
    } else {
      onChange(removeInterest(selections, interest.id));
    }
  };

  const save = (goalId: string) => {
    if (editing) onChange(setGoal(selections, editing.id, goalId));
    setSheetOpen(false);
  };

  const remove = () => {
    if (editing) onChange(removeInterest(selections, editing.id));
    setSheetOpen(false);
  };

  return (
    <View style={styles.container}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search by interest" />
      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle}>{group.name}</Text>
          <View style={styles.chips}>
            {group.interests.map((interest) => {
              const goalId = goalOf(selections, interest.id);
              const tag = goalId ? goalTag(goalId) : undefined;
              return (
                <PressableScale
                  key={interest.id}
                  onPress={() => press(interest)}
                  hitSlop={SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={tag ? `${interest.name}, ${tag}` : interest.name}
                  accessibilityState={{ selected: goalId !== undefined }}
                  style={[styles.chip, goalId !== undefined && styles.chipSelected]}>
                  {goalId ? <FontAwesome5 name="check" size={11} color={colors.bg} /> : null}
                  <Text style={[styles.chipLabel, goalId !== undefined && styles.chipLabelSelected]}>
                    {interest.name}
                  </Text>
                  {tag ? <Text style={styles.tag}>· {tag}</Text> : null}
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
      <GoalSheet
        visible={sheetOpen}
        interest={editing}
        currentGoalId={editing ? goalOf(selections, editing.id) : undefined}
        onSave={save}
        onRemove={remove}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { gap: spacing.lg },
  group: { gap: spacing.sm },
  groupTitle: { ...typeScale.label, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Same look as the shared Chip, which has no slot for the caption-style goal tag.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipLabel: { ...typeScale.label, fontSize: 13, lineHeight: 18, color: colors.text },
  chipLabelSelected: { color: colors.bg },
  // The tag only shows on a selected (ink) chip.
  tag: { ...typeScale.caption, color: colors.bg },
}));
