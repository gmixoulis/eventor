import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, TextField } from '@/components/account/fields';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getTicketType } from '@/data';
import { digitsOnly, luhnValid, validCvc, validExpiry } from '@/lib/card';
import { formatCents, fullName } from '@/lib/format';
import { useProfile, useSession, useTickets } from '@/store';

// The mock "processing" pause, so the demo can show the button working.
const PROCESSING_MS = 800;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function CheckoutScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const ticketType = getTicketType(type ?? '');
  const { profile } = useProfile();
  const { account } = useSession();
  const { purchase } = useTickets();

  const [holderName, setHolderName] = useState(fullName(profile));
  const [email, setEmail] = useState(account?.email ?? '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const digits = digitsOnly(cardNumber);
  const holderError = holderName.trim() ? null : 'This field is required';
  const emailError = email.trim() ? (EMAIL_RE.test(email.trim()) ? null : 'Enter a valid email') : 'This field is required';
  const cardError = cardNumber.trim() ? (luhnValid(digits) ? null : 'Enter a valid card number') : 'This field is required';
  const expiryError = expiry.trim() ? (validExpiry(expiry, new Date()) ? null : 'Enter MM/YY in the future') : 'This field is required';
  const cvcError = cvc.trim() ? (validCvc(cvc) ? null : '3 or 4 digits') : 'This field is required';

  if (!ticketType) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Checkout" variant="stack" />
        <EmptyState illustrated title="Unknown ticket" body="This ticket type is not available." />
      </View>
    );
  }

  const valid = !holderError && !emailError && !cardError && !expiryError && !cvcError;

  const pay = async () => {
    if (processing) return;
    setAttempted(true);
    setPayError(null);
    if (!valid) return;
    setProcessing(true);
    const [result] = await Promise.all([
      purchase({ typeId: ticketType.id, holderName: holderName.trim(), email: email.trim(), cardNumber, expiry, cvc }),
      new Promise((resolve) => setTimeout(resolve, PROCESSING_MS)),
    ]);
    setProcessing(false);
    if (result.ok) router.replace(`/tickets/${result.ticket.id}`);
    else if (result.error) setPayError(result.error);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Checkout" variant="stack" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.notice}>Demo checkout: no card is charged</Text>
        <Field label="Holder name" required error={holderError} showError={attempted}>
          <TextField value={holderName} onChangeText={setHolderName} autoCapitalize="words" autoComplete="name" />
        </Field>
        <Field label="Email" required error={emailError} showError={attempted}>
          <TextField value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        </Field>
        <Field label="Card number" required error={cardError} showError={attempted}>
          <TextField value={cardNumber} onChangeText={setCardNumber} keyboardType="number-pad" placeholder="4000 0000 0000 0002" />
        </Field>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Expiry" required error={expiryError} showError={attempted}>
              <TextField value={expiry} onChangeText={(value) => {
                const digits = digitsOnly(value).slice(0, 4);
                const deletingSlash = digits.length === 2 && !value.includes('/') && value.length < expiry.length;
                setExpiry(digits.length >= 2 && !deletingSlash ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
              }} keyboardType="number-pad" placeholder="MM/YY" />
            </Field>
          </View>
          <View style={styles.half}>
            <Field label="CVC" required error={cvcError} showError={attempted}>
              <TextField value={cvc} onChangeText={setCvc} keyboardType="number-pad" placeholder="123" secureTextEntry />
            </Field>
          </View>
        </View>
        {payError ? <Text style={styles.payError}>{payError}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          label={processing ? 'Processing...' : `Pay ${formatCents(ticketType.priceCents)}`}
          onPress={pay}
          disabled={processing}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.lg },
    notice: { ...typeScale.caption, color: colors.textMuted },
    row: { flexDirection: 'row', gap: spacing.md },
    half: { flex: 1 },
    payError: { ...typeScale.caption, color: colors.danger },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.bg,
    },
  }),
);
