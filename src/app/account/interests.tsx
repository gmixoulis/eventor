import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canApplySelections } from '@/components/matching/goals';
import { MatchHint } from '@/components/matching/hint';
import { InterestPicker } from '@/components/matching/interest-picker';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { Selection } from '@/data/types';
import { useProfile } from '@/store';

export default function InterestsScreen() {
  const styles = useStyles();
  const { profile, updateProfile } = useProfile();

  const change = (selections: Selection[]) => {
    if (!canApplySelections(selections, profile.networking)) {
      Alert.alert('Keep at least one interest so others can find you.');
      return;
    }
    updateProfile({ selections });
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="My interests" variant="stack" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.caption}>{profile.selections.length} selected</Text>
        <MatchHint />
        <InterestPicker selections={profile.selections} onChange={change} />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  caption: { ...typeScale.caption, color: colors.textMuted },
}));
