import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { DirectoryPage } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { Pill } from '@/components/pill';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listSideEvents } from '@/data';
import type { SideEvent } from '@/data/types';
import type { Decision } from '@/lib/applications';
import { useEventRequests, useOrganizerRole } from '@/store';

const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Not approved', withdrawn: 'Withdrawn' } as const;

/** The side events this account decides on: the sub-admin's own, or every one taken by request for the admin. */
function useMyEvents(): SideEvent[] {
  const { isAdmin, adminEvents } = useOrganizerRole();
  return listSideEvents().filter((e) => e.capacity !== undefined && (isAdmin || adminEvents.includes(e.id)));
}

export default function RequestsScreen() {
  const { event: eventId } = useLocalSearchParams<{ event?: string }>();
  const events = useMyEvents();
  const event = eventId ? events.find((e) => e.id === eventId) : undefined;
  return event ? <EventRequests event={event} /> : <EventList events={events} />;
}

function EventList({ events }: { events: SideEvent[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <DirectoryPage title="Side event requests" background={colors.bg}>
      <ScrollView contentContainerStyle={styles.list}>
        {events.length === 0 ? <EmptyState icon="calendar-blank" title="No side events to look after" /> : null}
        {events.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: '/organizer/requests', params: { event: e.id } })}
            accessibilityRole="button"
            accessibilityLabel={e.title}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Text style={styles.rowLabel}>{e.title}</Text>
            <FontAwesome5 name="chevron-right" size={12} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </DirectoryPage>
  );
}

function EventRequests({ event }: { event: SideEvent }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { rows, seatsLeft, error, decide } = useEventRequests(event.id);
  const [busy, setBusy] = useState<string | null>(null);

  const onDecide = async (id: string, decision: Decision) => {
    setBusy(id);
    const failed = await decide(id, decision);
    setBusy(null);
    if (failed) Alert.alert(decision === 'approve' ? 'Not approved' : 'Not rejected', failed);
  };

  return (
    <DirectoryPage title={event.title} background={colors.bg}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.seats} accessibilityLiveRegion="polite">
          {seatsLeft === null ? ' ' : seatsLeft > 0 ? `${seatsLeft} of ${event.capacity} seats left` : 'No seats left'}
        </Text>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {!error && rows?.length === 0 ? <EmptyState icon="account-clock-outline" title="No requests yet" /> : null}
        {rows?.map(({ application: app, label, reason }) => (
          <View key={app.id} style={styles.applicant}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{app.name}</Text>
              {app.status === 'pending' ? null : <Pill label={STATUS_LABEL[app.status]} tone="neutral" />}
            </View>
            <Text style={styles.caption}>{app.email}</Text>
            <Text style={styles.fit}>{reason ? `${label}. ${reason}` : label}</Text>
            {app.note ? <Text style={styles.note}>{app.note}</Text> : null}
            {app.status === 'pending' ? (
              <View style={styles.actions}>
                <Button label="Approve" accessibilityLabel={`Approve ${app.name}`} variant="outline"
                  disabled={busy !== null} onPress={() => void onDecide(app.id, 'approve')} />
                <Button label="Reject" accessibilityLabel={`Reject ${app.name}`} variant="ghost"
                  disabled={busy !== null} onPress={() => void onDecide(app.id, 'reject')} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: { ...typeScale.label, color: colors.text, flex: 1 },
  pressed: { opacity: 0.7 },
  seats: { ...typeScale.label, color: colors.text, padding: spacing.lg },
  error: { ...typeScale.body, color: colors.danger, padding: spacing.lg },
  applicant: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typeScale.label, color: colors.text, flex: 1 },
  caption: { ...typeScale.caption, color: colors.textMuted },
  fit: { ...typeScale.body, color: colors.text },
  note: { ...typeScale.body, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
}));
