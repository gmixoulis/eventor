import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Field, TextField } from '@/components/account/fields';
import { Button } from '@/components/button';
import { InterestPicker } from '@/components/matching/interest-picker';
import { Pill, type PillTone } from '@/components/pill';
import { Sheet } from '@/components/sheet';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { Selection, SideEvent } from '@/data/types';
import { NOTE_MAX, applicationError } from '@/lib/applications';
import { useMyRequest, useSession, type Application } from '@/store';

const STATUS: Record<Application['status'], { label: string; tone: PillTone; line: string } | null> = {
  pending: { label: 'Pending', tone: 'warning', line: 'Your request is waiting for the host' },
  approved: { label: 'Approved', tone: 'success', line: 'You have a place' },
  rejected: { label: 'Not approved', tone: 'danger', line: 'The host could not offer you a place' },
  withdrawn: null,
};

/**
 * "Request a place" for a side event taken by request: a form sheet (the account's name and email
 * when signed in; name, email and interests for a visitor), then the request's status with Withdraw.
 */
export function RequestPlace({ event, secondary }: { event: SideEvent; secondary: boolean }) {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const { account } = useSession();
  const { mine, visitorEmail, send, withdraw } = useMyRequest(event.id);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [selections, setSelections] = useState<Selection[]>([]);

  const status = mine ? STATUS[mine.status] : null;
  const fields = account ? { name: account.name, email: account.email, note } : { name, email, note };
  const formError = applicationError(fields);
  // A blank visitor form is not an error yet; the disabled Send button says enough.
  const shownError = error ?? (fields.name || fields.email || note ? formError : null);

  const start = () => {
    setError(null);
    if (!account && !email && visitorEmail) setEmail(visitorEmail);
    setOpen(true);
  };

  const submit = async () => {
    setPending(true);
    const failed = await send(account ? fields : { ...fields, selections: selections.map((s) => s.interestId) });
    setPending(false);
    setError(failed);
    if (failed) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOpen(false);
  };

  const confirmWithdraw = () => {
    Alert.alert('Withdraw your request?', event.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setPending(true);
          const failed = await withdraw();
          setPending(false);
          if (failed) Alert.alert('Not withdrawn', failed);
        },
      },
    ]);
  };

  if (mine && status) {
    const canWithdraw = mine.status === 'pending' || mine.status === 'approved';
    return (
      <View style={styles.held}>
        <Pill label={status.label} tone={status.tone} />
        <Text style={styles.heldText}>{status.line}</Text>
        {canWithdraw ? (
          <Button label="Withdraw" accessibilityLabel="Withdraw your request" variant="ghost" disabled={pending}
            onPress={confirmWithdraw} />
        ) : null}
      </View>
    );
  }

  return (
    <>
      <Button label="Request a place" variant={secondary ? 'outline' : 'primary'} onPress={start} />
      <Sheet visible={open} title="Request a place" onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: height * 0.7 }} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>{event.title}. The host reviews every request.</Text>
          {account ? (
            <View>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{account.name}</Text>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{account.email}</Text>
            </View>
          ) : (
            <>
              <Field label="Name" required>
                <TextField value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" />
              </Field>
              <Field label="Email" required>
                <TextField value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
                  autoComplete="email" />
              </Field>
              <Text style={styles.label}>Your interests</Text>
              <InterestPicker selections={selections} onChange={setSelections} />
            </>
          )}
          <Field label="Note to the host" right={<Text style={styles.label}>{note.length}/{NOTE_MAX}</Text>}>
            <TextField value={note} onChangeText={setNote} placeholder="Why you would like to come" multiline height={96} />
          </Field>
          {shownError ? <Text style={styles.error} accessibilityLiveRegion="polite">{shownError}</Text> : null}
          <Button label={pending ? 'One moment' : 'Send request'} disabled={pending || formError !== null}
            onPress={() => void submit()} />
        </ScrollView>
      </Sheet>
    </>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    held: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
    heldText: { ...typeScale.label, color: colors.text, flex: 1 },
    form: { gap: spacing.md, paddingBottom: spacing.md },
    lead: { ...typeScale.body, color: colors.textMuted },
    label: { ...typeScale.caption, color: colors.textMuted },
    value: { ...typeScale.body, color: colors.text, marginBottom: spacing.sm },
    error: { ...typeScale.caption, color: colors.danger },
  }),
);
