import { beforeEach, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import { makeGuestState } from '@/backend/state';
import type { Ticket } from '@/backend/types';
import { TicketSection } from '@/components/home/ticket-section';
import { useSession, useTickets } from '@/store';

jest.mock('@/store', () => ({ useSession: jest.fn(), useTickets: jest.fn() }));
jest.mock('@/components/home/section', () => ({ HomeList: 'HomeList', HomeSection: 'HomeSection' }));
jest.mock('@/components/row', () => ({ Row: 'Row' }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const latest: Ticket = {
  id: 'latest', typeId: 'ticket-day', holderName: 'Alex', email: 'alex@example.com', priceCents: 4500,
  cardBrand: 'Visa', cardLast4: '4242', purchasedAt: '2026-11-22T12:00:00Z', code: 'PTN1',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({ account: { id: 'acct-founder' } } as ReturnType<typeof useSession>);
  jest.mocked(useTickets).mockReturnValue({ tickets: [latest, { ...latest, id: 'older' }], purchase: jest.fn<ReturnType<typeof useTickets>['purchase']>() });
});

it('opens the latest account ticket from the Your ticket row', () => {
  const section = TicketSection() as ReactElement<{ children: ReactElement<{ children: ReactElement<{ title: string; onPress: () => void }> }> }>;
  const row = section.props.children.props.children;
  expect(row.props.title).toBe('Your ticket');
  row.props.onPress();
  expect(router.push).toHaveBeenCalledWith('/tickets/latest');
});

it('hides the ticket row for an account without tickets', () => {
  jest.mocked(useTickets).mockReturnValue({ tickets: makeGuestState().tickets, purchase: jest.fn<ReturnType<typeof useTickets>['purchase']>() });
  expect(TicketSection()).toBeNull();
});

it('hides any stale account ticket when signed out', () => {
  jest.mocked(useSession).mockReturnValue({ account: null } as ReturnType<typeof useSession>);
  expect(TicketSection()).toBeNull();
});
