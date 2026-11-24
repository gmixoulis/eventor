import { describe, expect, it, jest } from '@jest/globals';

import { makeGuestState } from '@/backend/state';
import type { Ticket } from '@/backend/types';
import { withTicket } from '@/store/tickets';

jest.mock('@/backend/api', () => ({ api: {} }));

const ticket: Ticket = {
  id: 'tkt-1',
  typeId: 'ticket-day',
  holderName: 'Alex Demo',
  email: 'alex@example.com',
  priceCents: 4500,
  cardBrand: 'Visa',
  cardLast4: '4242',
  purchasedAt: '2026-11-22T10:00:00.000Z',
  code: 'PTN000001',
};

describe('withTicket', () => {
  it('prepends the bought ticket', () => {
    const state = withTicket(makeGuestState(), ticket);
    expect(state.tickets).toEqual([ticket]);
    expect(withTicket(state, ticket).tickets).toHaveLength(2);
  });
});
