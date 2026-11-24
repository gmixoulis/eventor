import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

export type ScheduleView = 'agenda' | 'timeline';

/** Agenda or timeline, and compact rows for the timeline. */
export function DisplaySheet({ visible, onClose, view, onViewChange, compact, onCompactChange }: {
  visible: boolean; onClose: () => void; view: ScheduleView; onViewChange: (view: ScheduleView) => void;
  compact: boolean; onCompactChange: (compact: boolean) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} title="Display" onClose={onClose}>
      <Text style={styles.sheetLabel}>View</Text>
      <View style={styles.segmentRow}>
        {(['agenda', 'timeline'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => onViewChange(v)}
            style={[styles.segmentButton, view === v && styles.segmentButtonSelected]}
            accessibilityRole="button"
            accessibilityLabel={v === 'agenda' ? 'Agenda view' : 'Timeline view'}
            accessibilityState={{ selected: view === v }}>
            <Text style={[styles.segmentText, view === v && styles.segmentTextSelected]}>
              {v === 'agenda' ? 'Agenda' : 'Timeline'}
            </Text>
          </Pressable>
        ))}
      </View>
      {view === 'timeline' ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Compact rows</Text>
          <Switch
            value={compact}
            onValueChange={onCompactChange}
            trackColor={{ true: colors.primary }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    ...typeScale.body,
    color: colors.text,
  },
  sheetLabel: {
    ...typeScale.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  segmentButton: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    ...typeScale.label,
    fontSize: 12,
    color: colors.text,
  },
  segmentTextSelected: {
    color: colors.card,
  },
}));
