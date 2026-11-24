import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getTicketType } from '@/data';
import { formatCents, formatDateTime } from '@/lib/format';
import { useSettings, useTickets } from '@/store';

export default function TicketScreen() {
  const styles = useStyles();
  const { scheme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tickets } = useTickets();
  const { use24h } = useSettings();
  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Ticket" variant="stack" />
        <EmptyState illustrated title="Ticket not found" body="This ticket is not on this device." />
      </View>
    );
  }

  const type = getTicketType(ticket.typeId);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Ticket" variant="stack" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.typeName}>{type?.name ?? ticket.typeId}</Text>
          <Text style={styles.holder}>{ticket.holderName}</Text>
          <Text style={styles.meta}>{ticket.email}</Text>
          <Text style={styles.meta}>{formatCents(ticket.priceCents)}</Text>
          <View style={[styles.qr, scheme === 'dark' && styles.qrOnDark]}>
            <QRCode value={ticket.code} size={220} />
          </View>
          <Text style={styles.code}>{ticket.code}</Text>
          <Text style={styles.meta}>Purchased {formatDateTime(ticket.purchasedAt, use24h)}</Text>
          <Text style={styles.meta}>
            {ticket.cardBrand} ending {ticket.cardLast4}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg },
    card: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    typeName: { ...typeScale.title, color: colors.text, textAlign: 'center' },
    holder: { ...typeScale.label, fontSize: 17, lineHeight: 22, color: colors.text, textAlign: 'center' },
    meta: { ...typeScale.caption, color: colors.textMuted, textAlign: 'center' },
    qr: { marginTop: spacing.lg },
    // Scanners need dark modules on a light quiet zone, so the code keeps a white card in dark mode.
    qrOnDark: { backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: radius.sm },
    code: { ...typeScale.mono, color: colors.textMuted },
  }),
);
