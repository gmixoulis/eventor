import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChoiceModal, DirectoryPage, useDirectoryStyles } from '@/components/directory/ui';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listSideEvents } from '@/data';
import type { SideEvent } from '@/data/types';
import { useSession, useSideEventAdmins } from '@/store';

/** Admin only (route gate): every side event taken by request, with a picker of the demo accounts as its sub-admin. */
export default function AdminsScreen() {
  const styles = useStyles();
  const ds = useDirectoryStyles();
  const { colors } = useTheme();
  const { accounts } = useSession();
  const { admins, assign } = useSideEventAdmins();
  const [editing, setEditing] = useState<SideEvent | null>(null);
  const events = listSideEvents().filter((e) => e.capacity !== undefined);
  const nameOf = (id: string | undefined) => accounts.find((a) => a.id === id)?.name ?? 'No sub-admin';

  const pick = async (adminId: string | null) => {
    const event = editing;
    setEditing(null);
    if (!event) return;
    const failed = await assign(event.id, adminId);
    if (failed) Alert.alert('Not saved', failed);
  };

  const choices = [...accounts.map((a) => ({ id: a.id as string | null, name: a.name })), { id: null, name: 'No sub-admin' }];

  return (
    <DirectoryPage title="Side event sub-admins" background={colors.bg}>
      <ScrollView contentContainerStyle={styles.list}>
        {events.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setEditing(e)}
            accessibilityRole="button"
            accessibilityLabel={`${e.title}, sub-admin ${nameOf(admins[e.id])}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.text}>
              <Text style={styles.title}>{e.title}</Text>
              <Text style={styles.caption}>{nameOf(admins[e.id])}</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={12} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
      <ChoiceModal visible={editing !== null} onClose={() => setEditing(null)} title="Choose a sub-admin" sheet>
        {choices.map((choice) => (
          <Pressable key={choice.id ?? 'none'} style={ds.choice} accessibilityRole="radio"
            accessibilityState={{ checked: editing !== null && (admins[editing.id] ?? null) === choice.id }}
            onPress={() => void pick(choice.id)}>
            <Text style={ds.choiceText}>{choice.name}</Text>
          </Pressable>
        ))}
      </ChoiceModal>
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
    paddingVertical: spacing.sm,
  },
  text: { flex: 1, gap: 2 },
  title: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  pressed: { opacity: 0.7 },
}));
