import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { toggleIn } from '@/lib/utils';

export type FilterOption = { id: string; name: string };
export type FilterGroup = { id: string; name: string; options: FilterOption[] };

type Props = {
  visible: boolean;
  title: string;
  /** A flat list, or `groups` for options under headings. */
  options?: FilterOption[];
  groups?: FilterGroup[];
  selected: string[];
  onClose: () => void;
  onDone: (ids: string[]) => void;
};

/** Keep the sheet mounted for exit; reset its draft each time it opens. */
export function FilterSheet({ visible, title, options = [], groups, selected, onClose, onDone }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string[]>(selected);

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(selected);
  }

  const renderOption = (o: FilterOption) => (
    <Pressable key={o.id} onPress={() => setDraft((d) => toggleIn(d, o.id))} accessibilityRole="checkbox" accessibilityLabel={o.name}
      accessibilityState={{ checked: draft.includes(o.id) }} style={styles.option}>
      <Text style={[styles.optionText, draft.includes(o.id) && styles.optionSelected]}>
        {o.name}
      </Text>
      {draft.includes(o.id) ? (
        <FontAwesome5 name="check" size={14} color={colors.primary} />
      ) : null}
    </Pressable>
  );

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {groups
          ? groups.map((group) => (
              <View key={group.id}>
                <Text style={styles.heading} accessibilityRole="header">{group.name}</Text>
                {group.options.map(renderOption)}
              </View>
            ))
          : options.map(renderOption)}
      </ScrollView>
      <Button
        label="Done"
        accessibilityLabel="Apply filters"
        onPress={() => {
          onDone(draft);
          onClose();
        }}
      />
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  list: {
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  heading: { ...typeScale.overline, color: colors.textMuted, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: {
    ...typeScale.body,
    color: colors.text,
  },
  optionSelected: {
    color: colors.primary,
  },
}));
