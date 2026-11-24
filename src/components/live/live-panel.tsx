import { FontAwesome5 } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { agendaOverlapLabel } from '@/components/live/overlap';
import { ReminderBell } from '@/components/live/reminder-bell';
import { liveActions } from '@/components/live/reserve-state';
import { ReserveButton } from '@/components/live/reserve-button';
import { Availability } from '@/components/live/availability';
import { useLiveStatus } from '@/components/live/use-live-status';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { AgendaItem } from '@/lib/agenda-item';
import { useMyAgenda, useReservations, useSettings } from '@/store';

/** The availability block and the clash warning for a detail screen. */
export function LiveSummary({ item }: { item: AgendaItem }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { use24h } = useSettings();
  const status = useLiveStatus()(item);
  const overlap = agendaOverlapLabel(item, useMyAgenda(), use24h);
  return (
    <View style={styles.summary}>
      <Availability status={status} />
      {overlap ? (
        <View style={styles.overlap}>
          <FontAwesome5 name="exclamation-circle" size={12} color={colors.pendingText} />
          <Text style={styles.overlapText}>{overlap}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The footer's one order of actions, in every state: an optional `lead` (Check in while live) is
 * the primary action and comes first; otherwise reserve, join the waitlist or add to agenda is
 * primary. A held seat or waitlist place shows as a status line with its release action.
 * A saved item with nothing held also offers "Remove from my agenda". The reminder bell closes
 * the row; an ended item has no reserve control and no bell.
 */
export function LiveActions({ item, inAgenda, onToggle, lead, request }: {
  item: AgendaItem; inAgenda: boolean; onToggle: () => void; lead?: ReactNode;
  /** Replaces the reserve control for an item taken by request, unless a seat or waitlist place is already held. */
  request?: ReactNode;
}) {
  const styles = useStyles();
  const status = useLiveStatus()(item);
  const { statusOf } = useReservations();
  const shown = liveActions(status, statusOf(item.key), inAgenda);
  return (
    <View style={styles.stack}>
      {lead}
      <View style={styles.actions}>
        <View style={[styles.main, styles.stack]}>
          {shown.reserve ? (
            request !== undefined && statusOf(item.key) === null ? request : <ReserveButton item={item} secondary={lead !== undefined} />
          ) : null}
          {shown.agendaToggle ? (
            <Button
              label={inAgenda ? 'Remove from my agenda' : 'Add to my agenda'}
              variant={inAgenda || lead !== undefined ? 'outline' : 'primary'}
              onPress={onToggle}
            />
          ) : null}
        </View>
        {shown.bell ? <ReminderBell itemKey={item.key} /> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    summary: { gap: spacing.sm },
    overlap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    overlapText: { ...typeScale.caption, color: colors.pendingText, flexShrink: 1 },
    stack: { gap: spacing.sm },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    main: { flex: 1 },
  }),
);
