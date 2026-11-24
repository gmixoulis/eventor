import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { DirectoryPage, SearchField } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { SlotPicker } from '@/components/meetings/slot-picker';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { listPeople } from '@/data';
import type { Person } from '@/data/types';
import { fullName } from '@/lib/format';
import { useMeetings, useOccupiedMeetings, useOrganizer, useProfile } from '@/store';

export default function SuggestScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { meetings } = useMeetings();
  const { suggestMeeting } = useOrganizer();
  const occupied = useOccupiedMeetings();
  const [query, setQuery] = useState('');
  const [personB, setPersonB] = useState<Person | null>(null);

  const accountName = fullName(profile);
  const results = query.trim() ? listPeople(query.trim()) : [];

  return (
    <DirectoryPage title="Suggest a meeting" background={colors.bg}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Person A</Text>
        <View style={styles.personRow}>
          <Avatar name={accountName} size={32} shape="circle" />
          <Text style={styles.personName}>{accountName}</Text>
        </View>

        <Text style={styles.label}>Person B</Text>
        {personB ? (
          <Pressable
            onPress={() => setPersonB(null)}
            accessibilityRole="button"
            accessibilityLabel={`Selected ${personB.name}, tap to change`}
            style={styles.personRow}>
            <Avatar name={personB.name} size={32} shape="square" />
            <Text style={styles.personName}>{personB.name}</Text>
            <FontAwesome5 name="times" size={14} color={colors.textMuted} />
          </Pressable>
        ) : (
          <>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search people" />
            {query.trim() && !results.length ? (
              <EmptyState icon="account-search-outline" title="No people match" body="Check the spelling or try a shorter name." />
            ) : null}
            {results.map((person) => (
              <Pressable
                key={person.id}
                onPress={() => {
                  setPersonB(person);
                  setQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel={person.name}
                style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
                <Avatar name={person.name} size={32} shape="square" />
                <View style={styles.resultText}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.caption} numberOfLines={1}>
                    {person.title} · {person.company}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {personB ? (
          <SlotPicker
            me={{ availability: profile.availability, meetings }}
            them={{ availability: [], meetings: [] }}
            submitLabel="Suggest meeting"
            confirmation="Meeting suggested"
            occupied={occupied}
            onSubmit={(slot, note) => suggestMeeting(personB.id, slot, note)}
          />
        ) : null}
      </ScrollView>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  label: { ...typeScale.section, color: colors.text, marginTop: spacing.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  personName: { ...typeScale.label, color: colors.text, flex: 1 },
  caption: { ...typeScale.caption, color: colors.textMuted },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  resultText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
}));
