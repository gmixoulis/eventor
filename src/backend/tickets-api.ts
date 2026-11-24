import { getDb, load, scheduleWrite } from '@/backend/db';
import { delay } from '@/backend/latency';
import type { Ticket } from '@/backend/types';
import { getTicketType } from '@/data';
import { cardBrand, digitsOnly, isDeclined, luhnValid, validCvc, validExpiry } from '@/lib/card';

export type PurchaseInput = {
  typeId: string;
  holderName: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

let ticketSeq = 0;

export const ticketsApi = {
  /**
   * POST /tickets: buys a ticket for the signed-in account. Only the card brand and last four
   * digits are kept; the full number and CVC never reach the database. The demo decline card
   * (4000 0000 0000 0002) is refused with "Card declined" after the format checks pass.
   */
  async purchase(accountId: string, input: PurchaseInput): Promise<Ticket> {
    await load();
    await delay();
    const state = getDb().states[accountId];
    if (!state) throw new Error(`Unknown account ${accountId}`);
    const type = getTicketType(input.typeId);
    if (!type) throw new Error('Unknown ticket type');
    const digits = digitsOnly(input.cardNumber);
    if (!luhnValid(digits)) throw new Error('Invalid card number');
    if (!validExpiry(input.expiry, new Date())) throw new Error('Invalid expiry');
    if (!validCvc(input.cvc)) throw new Error('Invalid CVC');
    if (isDeclined(digits)) throw new Error('Card declined');
    ticketSeq += 1;
    const ticket: Ticket = {
      id: `tkt-${Date.now()}-${ticketSeq}`,
      typeId: type.id,
      holderName: input.holderName.trim(),
      email: input.email.trim(),
      priceCents: type.priceCents,
      cardBrand: cardBrand(digits),
      cardLast4: digits.slice(-4),
      purchasedAt: new Date().toISOString(),
      code: `PTN${String(Date.now()).slice(-6)}${String(ticketSeq).padStart(3, '0')}`,
    };
    state.tickets = [ticket, ...state.tickets];
    scheduleWrite();
    return ticket;
  },
};
