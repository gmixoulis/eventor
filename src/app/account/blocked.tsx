import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getPerson } from '@/data';
import type { Person } from '@/data/types';
import { useMatchFeedback } from '@/store';

// The route stays /account/blocked; it now lists the people marked Not relevant.
export default function HiddenPeopleScreen() {
  const styles = useStyles();
  const { hidden, unhide } = useMatchFeedback();

  const people = hidden
    .map((id) => getPerson(id))
    .filter((person): person is Person => person !== undefined);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="Hidden people" variant="stack" />
      {people.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState icon="eye-off-outline" title="No hidden people"
            body="People you mark Not relevant on their profile appear here, so you can bring them back." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.list}>
            {people.map((person, i) => (
              <View key={person.id} style={[styles.row, i > 0 && styles.divider]}>
                <Avatar name={person.name} size={44} />
                <View style={styles.text}>
                  <Text style={styles.name} numberOfLines={1}>{person.name}</Text>
                  <Text style={styles.role} numberOfLines={1}>{person.title} · {person.company}</Text>
                </View>
                <Button label="Show again" variant="outline" accessibilityLabel={`Show ${person.name} again`}
                  onPress={() => unhide(person.id)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, justifyContent: 'center' },
  content: { paddingTop: spacing.lg },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  text: { flex: 1, gap: 2 },
  name: { ...typeScale.label, color: colors.text },
  role: { ...typeScale.caption, color: colors.textMuted },
}));
