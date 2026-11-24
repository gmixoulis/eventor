import { FontAwesome5 } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChoiceModal } from '@/components/directory/ui';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { listSessions } from '@/data';
import { formatFullDay, parseDay } from '@/lib/format';

/** The schedule's day heading (opens a day menu), its actions and the row of day buttons. */
export function DayPicker({ days, dayId, onSelect, actions }: {
  days: string[]; dayId: string; onSelect: (day: string) => void; actions: ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  return (
    <>
      <View style={styles.dayRow}>
        <Pressable onPress={() => setDayMenuOpen(true)} style={styles.dayLabelWrap} hitSlop={8}>
          <Text style={styles.dayLabel}>{formatFullDay(dayId)}</Text>
          <FontAwesome5 name="chevron-down" size={12} color={colors.text} />
        </Pressable>

        <View style={styles.dayActions}>{actions}</View>
      </View>

      <View style={styles.dayButtonsRow}>
        {days.map((d) => {
          const selected = d === dayId;
          const { short, day } = parseDay(d);
          const hasSessions = listSessions({ day: d }).length > 0;
          return (
            <Pressable
              key={d}
              onPress={() => onSelect(d)}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}>
              <Text style={[styles.dayButtonWeekday, selected && styles.dayButtonTextSelected]}>
                {short}
              </Text>
              <Text style={[styles.dayButtonDay, selected && styles.dayButtonTextSelected]}>
                {day}
              </Text>
              {hasSessions ? (
                <View
                  style={[styles.dayDot, selected ? styles.dayDotSelected : styles.dayDotIdle]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <ChoiceModal visible={dayMenuOpen} onClose={() => setDayMenuOpen(false)}>
        {days.map((d) => (
          <Pressable
            key={d}
            onPress={() => {
              onSelect(d);
              setDayMenuOpen(false);
            }}
            style={styles.dayMenuItem}>
            <Text style={[styles.dayMenuItemText, d === dayId && styles.dayMenuItemSelected]}>
              {formatFullDay(d)}
            </Text>
            {d === dayId ? (
              <FontAwesome5 name="check" size={14} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </ChoiceModal>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dayLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayLabel: {
    ...typeScale.title,
    color: colors.text,
  },
  dayActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dayButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.text,
  },
  dayButtonWeekday: {
    ...typeScale.caption,
    fontSize: 12,
    color: colors.text,
  },
  dayButtonDay: {
    ...typeScale.label,
    fontSize: 15,
    color: colors.text,
  },
  dayButtonTextSelected: {
    color: colors.bg,
  },
  dayDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Days with sessions carry a red dot from the welcome art.
  dayDotIdle: {
    backgroundColor: colors.artRed,
  },
  dayDotSelected: {
    backgroundColor: colors.artRed,
  },
  dayMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayMenuItemText: {
    ...typeScale.body,
    color: colors.text,
  },
  dayMenuItemSelected: {
    color: colors.primary,
  },
}));
