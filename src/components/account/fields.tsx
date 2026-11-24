import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { FormSubmitted } from '@/components/account/form-page';
import { ChoiceModal } from '@/components/directory/ui';
import { makeStyles, useTheme } from '@/components/theme';
import { fonts, radius, spacing, typeScale } from '@/constants/theme';

/** Lets an input tell its Field it was left, and read whether its error may show yet. */
const FieldState = createContext({ label: '', showError: true, hasError: false, onLeave: () => {} });

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string | null;
  showError?: boolean;
  /** Rendered on the right of the label row (e.g. a live character counter). */
  right?: ReactNode;
  children: ReactNode;
};

export function Field({ label, required, error, showError: showImmediately = false, right, children }: FieldProps) {
  const styles = useStyles();
  const [left, setLeft] = useState(false);
  const submitted = use(FormSubmitted);
  const showError = showImmediately || left || submitted;
  const visibleError = showError ? error : null;

  useEffect(() => {
    if (visibleError) AccessibilityInfo.announceForAccessibility(`${label}. ${visibleError}`);
  }, [label, visibleError]);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {right}
      </View>
      <FieldState value={{ label, showError, hasError: Boolean(error), onLeave: () => setLeft(true) }}>{children}</FieldState>
      {error && showError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type TextFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  height?: number;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  rightAccessory?: ReactNode;
};

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  height,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  autoComplete,
  returnKeyType,
  accessibilityLabel,
  accessibilityHint,
  onSubmitEditing,
  rightAccessory,
}: TextFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const field = use(FieldState);
  return (
    <View
      style={[
        styles.inputWrap,
        multiline && { height: height ?? 120, alignItems: 'flex-start' },
        field.hasError && field.showError && styles.inputError,
      ]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={field.onLeave}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted} cursorColor={colors.primary} selectionColor={colors.primary}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType}
        accessibilityLabel={accessibilityLabel ?? (field.label || undefined)}
        accessibilityHint={accessibilityHint}
        onSubmitEditing={onSubmitEditing}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          rightAccessory ? styles.inputWithAccessory : null,
        ]}
      />
      {rightAccessory}
    </View>
  );
}

type SelectFieldProps = {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder: string;
};

export function SelectField({ value, options, onSelect, placeholder }: SelectFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const field = use(FieldState);
  const close = () => {
    setOpen(false);
    field.onLeave();
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.inputWrap,
          field.hasError && field.showError && styles.inputError,
          pressed && styles.pressed,
        ]}>
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
          {value || placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>
      <ChoiceModal visible={open} onClose={close} sheet>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ checked: selected }}
              style={styles.option}
              onPress={() => {
                onSelect(option);
                close();
              }}>
              <Text style={[styles.optionText, selected && styles.optionSelected]}>{option}</Text>
              {selected ? (
                <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </ChoiceModal>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  field: { gap: spacing.xs },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { ...typeScale.caption, color: colors.text },
  required: { color: colors.danger },
  error: { ...typeScale.caption, color: colors.danger },
  inputWrap: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  inputError: { borderColor: colors.danger },
  input: { ...typeScale.body, color: colors.text, flex: 1, padding: 0, minHeight: 44 },
  inputMultiline: { height: '100%', textAlignVertical: 'top', paddingVertical: spacing.sm },
  inputWithAccessory: { paddingRight: spacing.xs },
  selectValue: { ...typeScale.body, color: colors.text, flex: 1 },
  selectPlaceholder: { ...typeScale.body, color: colors.textMuted, flex: 1 },
  pressed: { opacity: 0.7 },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { ...typeScale.body, color: colors.text },
  optionSelected: { fontFamily: fonts.sansSemibold },
}));
