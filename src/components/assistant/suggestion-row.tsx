import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/chip';
import { spacing } from '@/constants/theme';

type Props = { suggestions: readonly string[]; sending: boolean; onAsk: (question: string) => void };

export function SuggestionRow({ suggestions, sending, onAsk }: Props) {
  if (!suggestions.length) return null;
  return (
    <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
      {suggestions.map((question) => (
        <Chip key={question} label={question} accessibilityLabel={`Ask: ${question}`}
          disabled={sending} onPress={() => onAsk(question)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The shared Chip's 32 pt height plus 6 pt hit slop on each side provides a 44 pt target.
  row: { gap: spacing.sm, paddingVertical: 6, paddingHorizontal: spacing.xs },
});
