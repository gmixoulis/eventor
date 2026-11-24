import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getTicketType } from '@/data';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
    getAllKeys: jest.fn(async () => Array.from(mockStorage.keys())),
    multiRemove: jest.fn(async (keys: string[]) => keys.forEach((k) => mockStorage.delete(k))),
  },
}));

declare const require: (id: string) => unknown;

function loadApi(): typeof import('@/backend/api') {
  jest.resetModules();
  return require('@/backend/api') as typeof import('@/backend/api');
}

beforeEach(() => {
  mockStorage.clear();
});

const CARD = '4242424242424242';
const CVC = '123';

type TestInput = {
  typeId: string;
  holderName: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

function input(overrides: Partial<TestInput> = {}): TestInput {
  return {
    typeId: 'ticket-day',
    holderName: 'Alex Demo',
    email: 'alex@example.com',
    cardNumber: CARD,
    expiry: '12/28',
    cvc: CVC,
    ...overrides,
  };
}

describe('tickets api', () => {
  it('buys a ticket and stores only the brand and last four digits', async () => {
    const { api } = loadApi();
    const ticket = await api.tickets.purchase('acct-founder', input());
    expect(ticket).toMatchObject({
      typeId: 'ticket-day',
      holderName: 'Alex Demo',
      email: 'alex@example.com',
      priceCents: getTicketType('ticket-day')?.priceCents,
      cardBrand: 'Visa',
      cardLast4: '4242',
    });
    expect(ticket.code).toBeTruthy();

    // The full number and CVC never reach the stored ticket.
    const serialized = JSON.stringify(ticket);
    expect(serialized).not.toContain(CARD);
    expect(serialized).not.toContain(CVC);
    const stored = await api.me.get('acct-founder');
    expect(stored?.tickets).toHaveLength(1);
    expect(JSON.stringify(stored?.tickets)).not.toContain(CARD);
    expect(JSON.stringify(stored?.tickets)).not.toContain(CVC);
  });

  it('refuses the demo decline card with "Card declined"', async () => {
    const { api } = loadApi();
    await expect(api.tickets.purchase('acct-founder', input({ cardNumber: '4000 0000 0000 0002' }))).rejects.toThrow('Card declined');
    expect((await api.me.get('acct-founder'))?.tickets).toEqual([]);
  });

  it('rejects an invalid card number and an unknown ticket type', async () => {
    const { api } = loadApi();
    await expect(api.tickets.purchase('acct-founder', input({ cardNumber: '1234' }))).rejects.toThrow('Invalid card number');
    await expect(api.tickets.purchase('acct-founder', input({ typeId: 'ticket-nope' }))).rejects.toThrow('Unknown ticket type');
  });

  it.each([
    [{ expiry: '01/20', cvc: '1' }, 'Invalid expiry'],
    [{ expiry: '12/28', cvc: '1' }, 'Invalid CVC'],
  ])('checks expiry and CVC before declining the demo card: %s', async (overrides, error) => {
    const { api } = loadApi();
    await expect(api.tickets.purchase('acct-founder', input({ cardNumber: '4000 0000 0000 0002', ...overrides })))
      .rejects.toThrow(error);
    expect((await api.me.get('acct-founder'))?.tickets).toEqual([]);
  });
});
