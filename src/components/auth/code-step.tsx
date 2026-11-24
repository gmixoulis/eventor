import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field, TextField } from '@/components/account/fields';
import { FormSubmitted } from '@/components/account/form-page';
import { CODE_LENGTH, codeDigits, DEMO_CODE, isDemoCode } from '@/components/auth/code';
import { Button } from '@/components/button';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';

type Props = {
  email: string;
  onVerified: () => void;
  onVisitor: () => void;
};

// iOS and Android name the one-time-code autofill hint differently.
const CODE_AUTOFILL = Platform.select({ ios: 'one-time-code', default: 'sms-otp' } as const);

/** Code step of sign-in. No code is sent in this demo build; the helper line gives it away. */
export function CodeStep({ email, onVerified, onVisitor }: Props) {
  const styles = useStyles();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (value: string) => {
    if (isDemoCode(value)) {
      onVerified();
      return;
    }
    setError('That code is not right.');
    setCode('');
  };

  const change = (text: string) => {
    const digits = codeDigits(text);
    setCode(digits);
    // The fourth digit submits on its own, like a real code field.
    if (digits.length === CODE_LENGTH) submit(digits);
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}>
        <Text style={styles.title} accessibilityRole="header">
          Enter your code
        </Text>
        <Text style={styles.caption}>Enter the code we sent to {email}.</Text>
      </View>

      <FormSubmitted value={error !== null}>
        <Field label="Code" error={error}>
          <TextField
            value={code}
            onChangeText={change}
            placeholder="4 digits"
            keyboardType="number-pad"
            autoCapitalize="none"
            autoComplete={CODE_AUTOFILL}
            returnKeyType="go"
            onSubmitEditing={() => {
              if (code) submit(code);
            }}
          />
        </Field>
      </FormSubmitted>
      <Text style={styles.helper}>Demo build: the code is {DEMO_CODE}.</Text>

      <View style={styles.actions}>
        <Button label="Continue" accessibilityLabel="Continue" disabled={!code} onPress={() => submit(code)} />
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
  quiet: { alignItems: 'center' },
}));
