import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/button';
import { DEFAULT_GOAL, goalChoices } from '@/components/matching/goals';
import { PressableScale } from '@/components/pressable-scale';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { Interest } from '@/data/types';

type Props = {
  visible: boolean;
  interest: Interest | null;
  /** The interest's current goal when it is already selected. */
  currentGoalId?: string;
  onSave: (goalId: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

/** Single choice of a goal for one interest, grouped by the intents the interest allows. */
export function GoalSheet({ visible, interest, currentGoalId, onSave, onRemove, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [choice, setChoice] = useState(currentGoalId ?? DEFAULT_GOAL);
  const [wasVisible, setWasVisible] = useState(visible);
  // Each opening starts from the interest's current goal.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setChoice(currentGoalId ?? DEFAULT_GOAL);
  }

  const choices = interest ? goalChoices(interest) : [];

  const pick = (goalId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChoice(goalId);
  };

  return (
    <Sheet visible={visible} title={interest?.name ?? ''} onClose={onClose}>
      <Text style={styles.caption}>What is your goal with this?</Text>
      <ScrollView style={{ maxHeight: height * 0.5 }} contentContainerStyle={styles.list}>
        {choices.map(({ intent, goals }) => (
          <View key={intent.id} accessibilityRole="radiogroup" accessibilityLabel={intent.name}>
            <Text style={styles.group}>{intent.name}</Text>
            {goals.map((goal) => {
              const checked = goal.id === choice;
              return (
                <PressableScale
                  key={goal.id}
                  feedback="highlight"
                  onPress={() => pick(goal.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  style={styles.option}>
                  <FontAwesome5
                    name={checked ? 'dot-circle' : 'circle'}
                    size={18}
                    color={checked ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.optionText}>{goal.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Save" onPress={() => onSave(choice)} />
        {currentGoalId ? (
          <PressableScale
            onPress={onRemove}
            accessibilityRole="button"
            style={styles.remove}>
            <Text style={styles.removeText}>Remove interest</Text>
          </PressableScale>
        ) : null}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  caption: { ...typeScale.caption, color: colors.textMuted, marginTop: -spacing.sm },
  list: { paddingVertical: spacing.sm, gap: spacing.md },
  group: { ...typeScale.label, color: colors.textMuted, marginBottom: spacing.xs },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  optionText: { ...typeScale.body, color: colors.text, flex: 1 },
  actions: { gap: spacing.sm, paddingTop: spacing.md },
  // Outline button with danger text; the shared Button has no danger variant.
  remove: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
  },
  removeText: { ...typeScale.label, color: colors.danger },
}));
