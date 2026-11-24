import type { TicketType } from '@/data/types';

// Placeholder names and prices until the owner picks real ones (plan open point 4).
export const ticketTypes: TicketType[] = [
  {
    id: 'ticket-day',
    name: 'Day pass',
    description: 'One full day at the summit, every talk and stage included.',
    priceCents: 4500,
  },
  {
    id: 'ticket-full',
    name: 'Full pass',
    description: 'All three days plus the side events around the city.',
    priceCents: 12000,
  },
  {
    id: 'ticket-student',
    name: 'Student pass',
    description: 'A discounted pass for students, every stage included.',
    priceCents: 2500,
  },
];

export function getTicketType(id: string): TicketType | undefined {
  return ticketTypes.find((type) => type.id === id);
}
