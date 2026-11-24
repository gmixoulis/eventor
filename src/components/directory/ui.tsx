import { FontAwesome5 } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

type PageProps = { title: string; children: ReactNode; background?: string };

export function DirectoryPage({ title, children, background }: PageProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.page, { backgroundColor: background ?? colors.card }]}>
      <ScreenHeader variant="stack" title={title} />
      {children}
    </SafeAreaView>
  );
}

export function SearchField({ value, onChangeText, placeholder, autoFocus = false }: {
  value: string; onChangeText: (value: string) => void; placeholder: string; autoFocus?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.focused]}>
      {(focused || value || autoFocus) ? <FontAwesome5 name="search" size={14} color={colors.textMuted} /> : null}
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        placeholder={focused || value || autoFocus ? placeholder : ''}
        placeholderTextColor={colors.textMuted} cursorColor={colors.primary} selectionColor={colors.primary}
        style={styles.input}
      />
      {!focused && !value && !autoFocus ? (
        <View pointerEvents="none" style={styles.searchPlaceholder}>
          <FontAwesome5 name="search" size={14} color={colors.textMuted} />
          <Text style={styles.caption}>{placeholder}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ChoiceModal({ visible, onClose, title, children, sheet = false }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; sheet?: boolean;
}) {
  const styles = useStyles();
  if (sheet) {
    return (
      <Sheet visible={visible} title={title ?? 'Choose an option'} onClose={onClose}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>{children}</ScrollView>
      </Sheet>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} />
        </View>
        <View style={styles.menu}>
          <SafeAreaView edges={['bottom']} style={styles.shrink} accessibilityViewIsModal>
            {title ? <Text style={styles.modalTitle}>{title}</Text> : null}
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

export const useDirectoryStyles = makeStyles(({ colors }) => StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  searchWrap: { padding: spacing.md },
  text: { ...typeScale.body, color: colors.text },
  title: { ...typeScale.title, color: colors.text },
  section: { ...typeScale.section, color: colors.text },
  label: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1, minWidth: 0 },
  choice: { height: 41, justifyContent: 'center', paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  choiceText: { ...typeScale.caption, fontSize: 13, lineHeight: 18, color: colors.text },
}));

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1 },
  search: { height: 36, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm,
    backgroundColor: colors.card },
  focused: { borderColor: colors.primary },
  input: { ...typeScale.caption, color: colors.text, flex: 1, padding: 0, height: '100%' },
  caption: { ...typeScale.caption, color: colors.textMuted },
  searchPlaceholder: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm },
  modal: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  menu: { backgroundColor: colors.card, borderRadius: radius.sm, maxHeight: '80%', overflow: 'hidden' },
  shrink: { flexShrink: 1 },
  modalTitle: { ...typeScale.section, color: colors.text, padding: spacing.md },
}));
