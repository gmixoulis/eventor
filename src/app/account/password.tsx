import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { Field, TextField } from '@/components/account/fields';
import { FormPage } from '@/components/account/form-page';
import { confirmPasswordError, passwordError, requiredError } from '@/components/account/validators';
import { useTheme } from '@/components/theme';

function SecureField({
  label,
  value,
  onChangeText,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error: string | null;
}) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required error={error}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        placeholder="Password"
        rightAccessory={
          <Pressable
            onPress={() => setShow((s) => !s)}
            hitSlop={13}
            accessibilityRole="button"
            accessibilityLabel={show ? `Hide ${label}` : `Show ${label}`}>
            <MaterialCommunityIcons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        }
      />
    </Field>
  );
}

export default function PasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const save = () =>
    Alert.alert('Password changes need a server connection. Nothing was changed.');

  const currentErr = requiredError(current);
  const nextErr = passwordError(next);
  const confirmErr = confirmPasswordError(next, confirm);
  const saveDisabled = currentErr !== null || nextErr !== null || confirmErr !== null;

  return (
    <FormPage title="Password" onSave={save} saveDisabled={saveDisabled} navigateBack={false}>
      <SecureField label="Current password" value={current} onChangeText={setCurrent} error={currentErr} />
      <SecureField label="New password" value={next} onChangeText={setNext} error={nextErr} />
      <SecureField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={confirmErr}
      />
    </FormPage>
  );
}
