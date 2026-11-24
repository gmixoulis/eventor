import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import type { Account } from '@/store';

function AccountCard({ account, onPick }: { account: Account; onPick: () => void }) {
  const styles = useStyles();
  return (
    <PressableScale
      onPress={onPick}
      feedback="highlight"
      accessibilityRole="button"
      accessibilityLabel={`Sign in as ${account.name}, ${account.title} at ${account.company}`}
      style={styles.card}>
      <Avatar name={account.name} size={48} shape="circle" />
      <View style={styles.cardText}>
        <Text style={styles.cardRole}>{account.role}</Text>
        <Text style={styles.cardName}>{account.name}</Text>
        <Text style={styles.cardTitle}>
          {account.title} at {account.company}
        </Text>
        <Text style={styles.cardTagline}>{account.tagline}</Text>
      </View>
    </PressableScale>
  );
}

/** The demo accounts as tappable cards; `onPick` receives the account id. */
export function AccountPicker({ accounts, onPick }: { accounts: Account[]; onPick: (id: string) => void }) {
  const styles = useStyles();
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} onPick={() => onPick(account.id)} />
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardText: { flex: 1, gap: 2 },
  cardRole: { ...typeScale.overline, color: colors.primary },
  cardName: { ...typeScale.section, color: colors.text },
  cardTitle: { ...typeScale.caption, color: colors.text },
  cardTagline: { ...typeScale.caption, color: colors.textMuted },
}));
