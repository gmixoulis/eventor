import { api } from '@/backend/api';
import type { StoreState, Ticket } from '@/backend/types';
import type { PurchaseInput } from '@/backend/tickets-api';
import { requireSignIn } from '@/components/auth/require-sign-in';
import { useStoreValue } from '@/store/context';

/** Prepends a bought ticket to the account's list. */
export function withTicket(s: StoreState, ticket: Ticket): StoreState {
  return { ...s, tickets: [ticket, ...s.tickets] };
}

export type PurchaseResult = { ok: true; ticket: Ticket } | { ok: false; error: string };

export function useTickets(): {
  tickets: Ticket[];
  purchase: (input: PurchaseInput) => Promise<PurchaseResult>;
} {
  const { state, setState, accountIdRef } = useStoreValue();
  return {
    tickets: state.tickets,
    purchase: async (input: PurchaseInput): Promise<PurchaseResult> => {
      const id = accountIdRef.current;
      if (id === null) {
        requireSignIn();
        return { ok: false, error: '' };
      }
      try {
        const ticket = await api.tickets.purchase(id, input);
        if (accountIdRef.current !== id) return { ok: false, error: '' };
        setState((s) => withTicket(s, ticket));
        return { ok: true, ticket };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Something went wrong' };
      }
    },
  };
}
