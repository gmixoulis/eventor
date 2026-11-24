import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { submitStatus, type SubmitStatus } from '@/components/meetings/submit-status';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getEvent } from '@/data';
import { formatShortDay, formatTime } from '@/lib/format';
import { freeSlots, type FreeSlot, type SlotMeeting, type SlotParty } from '@/matching/slots';
import { useSettings } from '@/store';

const NOTE_MAX = 140;

type Props = {
  me: SlotParty;
  them: SlotParty;
  submitLabel: string;
  confirmation: string;
  /** Every other booked meeting (all accounts), so tables are never handed out twice. */
  occupied: SlotMeeting[];
  /** Returns whether the meeting was written; the confirmation shows only when it was. */
  onSubmit: (slot: FreeSlot, note?: string) => boolean;
};

/**
 * Day selector, free-slot chips, note field and a submit button. Reused for
 * meeting requests, rescheduling and organizer suggestions.
 */
export function SlotPicker({ me, them, submitLabel, confirmation, occupied, onSubmit }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { use24h } = useSettings();
  const days = getEvent().days;
  const [day, setDay] = useState(
    () => days.find((d) => freeSlots(d, me, them, occupied).length > 0) ?? days[0] ?? '',
  );
  const [selected, setSelected] = useState<FreeSlot | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const slots = freeSlots(day, me, them, occupied);

  if (status === 'sent' && selected) {
    return (
      <View style={styles.confirm}>
        <Text style={styles.confirmTitle}>{confirmation}</Text>
        <Text style={styles.confirmBody}>
          Table {selected.table}, {formatTime(selected.start, use24h)} on {formatShortDay(day)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.days}>
        {days.map((d) => (
          <Chip
            key={d}
            label={formatShortDay(d)}
            selected={d === day}
            onPress={() => {
              setDay(d);
              setSelected(null);
            }}
          />
        ))}
      </View>

      {slots.length === 0 ? (
        <Text style={styles.empty}>No common free time on this day</Text>
      ) : (
        <View style={styles.slots}>
          {slots.map((slot) => (
            <Chip
              key={slot.id}
              label={formatTime(slot.start, use24h)}
              selected={selected?.id === slot.id}
              onPress={() => setSelected(slot)}
            />
          ))}
        </View>
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={NOTE_MAX}
        placeholder="Add a note (optional)"
        placeholderTextColor={colors.textMuted} cursorColor={colors.primary} selectionColor={colors.primary}
        accessibilityLabel="Meeting note"
        multiline
        style={styles.note}
      />

      {status === 'error' ? (
        <Text style={styles.error} accessibilityRole="alert">
          That did not go through. Please try again.
        </Text>
      ) : null}

      <Button
        label={submitLabel}
        disabled={!selected}
        onPress={() => {
          if (!selected) return;
          setStatus(submitStatus(onSubmit(selected, note.trim() || undefined)));
        }}
        accessibilityLabel={submitLabel}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { gap: spacing.md },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { ...typeScale.caption, color: colors.textMuted },
  note: {
    ...typeScale.body,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  error: { ...typeScale.caption, color: colors.danger },
  confirm: { gap: spacing.sm, paddingVertical: spacing.lg },
  confirmTitle: { ...typeScale.section, color: colors.success },
  confirmBody: { ...typeScale.body, color: colors.text },
}));
