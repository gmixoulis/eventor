import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, TextField } from '@/components/account/fields';
import { FormSubmitted } from '@/components/account/form-page';
import { emailError } from '@/components/auth/email';
import { Button } from '@/components/button';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';

type Props = {
  /** Shown when a private page or action sent the user here. */
  title: string;
  /** Restores the address when coming back from the code step. */
  initialEmail: string;
  onContinue: (email: string) => void;
  onVisitor: () => void;
};

/** Email step of sign-in. The address stays in screen state only: never stored, logged or sent. */
export function EmailStep({ title, initialEmail, onContinue, onVisitor }: Props) {
  const styles = useStyles();
  const [email, setEmail] = useState(initialEmail);
  // Errors appear only after the first press of Continue, never while typing a first attempt.
  const [tried, setTried] = useState(false);
  const error = tried ? emailError(email) : null;

  const submit = () => {
    setTried(true);
    if (!emailError(email)) onContinue(email.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.caption}>Use the address you registered for the festival with.</Text>
      </View>

      <FormSubmitted value={tried}>
        <Field label="Email" error={error}>
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={() => {
              if (email.trim()) submit();
            }}
          />
        </Field>
      </FormSubmitted>
      <Text style={styles.helper}>Next, you will enter the code we send to it.</Text>

      <View style={styles.actions}>
        <Button label="Continue with email" accessibilityLabel="Continue with email" disabled={!email.trim()} onPress={submit} />
        <View style={styles.quiet}>
          <Button label="Continue as a visitor" accessibilityLabel="Continue as a visitor" variant="ghost" onPress={onVisitor} />
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  intro: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...typeScale.title, color: colors.text },
  caption: { ...typeScale.body, color: colors.textMuted },
  helper: { ...typeScale.caption, color: colors.textMuted, marginTop: -spacing.xs },
  actions: { gap: spacing.md, marginTop: spacing.md },
  quiet: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
}));
