import { router } from 'expo-router';

import { HomeList, HomeSection } from '@/components/home/section';
import { Row } from '@/components/row';
import { getTicketType } from '@/data';
import { useSession, useTickets } from '@/store';

export function TicketSection() {
  const { account } = useSession();
  const { tickets } = useTickets();
  // Purchases are prepended by both the API and the account store.
  const latest = tickets[0];
  if (!account || !latest) return null;
  return <HomeSection title="Tickets">
    <HomeList>
      <Row icon="ticket-alt" title="Your ticket" subtitle={getTicketType(latest.typeId)?.name ?? latest.typeId}
        onPress={() => router.push(`/tickets/${latest.id}`)} />
    </HomeList>
  </HomeSection>;
}
