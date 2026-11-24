import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act } from 'react';

import CheckoutScreen from '@/app/tickets/checkout';
import { makeGuestState } from '@/backend/state';
import { useProfile, useSession, useTickets } from '@/store';
import { createRoot } from '@/test/renderer';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: (styles: unknown) => styles },
  Platform: { select: (options: { default?: unknown }) => options.default, OS: 'ios' },
}));
jest.mock('expo-router', () => ({ router: {}, useLocalSearchParams: () => ({ type: 'ticket-day' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('@/components/account/fields', () => ({ Field: 'Field', TextField: 'TextField' }));
jest.mock('@/components/button', () => ({ Button: 'Button' }));
jest.mock('@/components/empty-state', () => ({ EmptyState: 'EmptyState' }));
jest.mock('@/components/screen-header', () => ({ ScreenHeader: 'ScreenHeader' }));
jest.mock('@/components/theme', () => ({ makeStyles: () => () => ({}) }));
jest.mock('@/store', () => ({ useProfile: jest.fn(), useSession: jest.fn(), useTickets: jest.fn() }));

let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const profile = { ...makeGuestState().profile, firstName: 'Alex', lastName: 'Demo' };
  jest.mocked(useProfile).mockReturnValue({ profile, updateProfile: jest.fn() });
  jest.mocked(useSession).mockReturnValue({ account: { email: 'alex.demo@example.com' } } as ReturnType<typeof useSession>);
  jest.mocked(useTickets).mockReturnValue({ tickets: [], purchase: jest.fn<ReturnType<typeof useTickets>['purchase']>() });
  root = createRoot();
});

afterEach(async () => {
  await act(async () => root.unmount());
});

it('prefills the holder email from the signed-in account alongside the name', async () => {
  await act(async () => root.render(<CheckoutScreen />));
  const fields = root.container.queryAll((node) => node.type === 'TextField');
  expect(fields.find((field) => field.props.autoComplete === 'email')?.props.value).toBe('alex.demo@example.com');
  expect(fields.find((field) => field.props.autoComplete === 'name')?.props.value).toBe('Alex Demo');
});

it('inserts an expiry slash after two digits and supports paste and backspace', async () => {
  await act(async () => root.render(<CheckoutScreen />));
  const expiry = () => root.container.queryAll((node) => node.props.placeholder === 'MM/YY')[0];
  for (const [typed, expected] of [
    ['1', '1'], ['12', '12/'], ['12/2', '12/2'], ['12/28', '12/28'],
    ['1228', '12/28'], ['12/2', '12/2'], ['12/', '12/'], ['12', '12'], ['1', '1'],
  ]) {
    await act(async () => (expiry().props.onChangeText as (value: string) => void)(typed));
    expect(expiry().props.value).toBe(expected);
  }
});
