import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Row, RowGroup } from '@/components/row';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getTicketType, ticketTypes } from '@/data';
import { formatCents } from '@/lib/format';
import { useTickets } from '@/store';

export default function TicketsScreen() {
  const styles = useStyles();
  const { tickets } = useTickets();
  return (
    <View style={styles.container}>
      <ScreenHeader title="Tickets" variant="stack" />
      <ScrollView contentContainerStyle={styles.content}>
        <RowGroup title="Buy a ticket">
          {ticketTypes.map((type) => (
            <Row
              key={type.id}
              icon="ticket-alt"
              title={type.name}
              subtitle={`${formatCents(type.priceCents)} · ${type.description}`}
              onPress={() => router.push({ pathname: '/tickets/checkout', params: { type: type.id } })}
            />
          ))}
        </RowGroup>

        {tickets.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>My tickets</Text>
            <Text style={styles.emptyBody}>No tickets yet. Buy a pass above and your ticket appears here.</Text>
          </View>
        ) : (
          <RowGroup title="My tickets">
            {tickets.map((ticket) => (
              <Row
                key={ticket.id}
                icon="qrcode"
                title={getTicketType(ticket.typeId)?.name ?? ticket.typeId}
                subtitle={`${formatCents(ticket.priceCents)} · ${ticket.cardBrand} ending ${ticket.cardLast4}`}
                onPress={() => router.push(`/tickets/${ticket.id}`)}
              />
            ))}
          </RowGroup>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: spacing.xl },
    empty: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xs },
    emptyTitle: { ...typeScale.section, color: colors.text },
    emptyBody: { ...typeScale.caption, color: colors.textMuted },
  }),
);
