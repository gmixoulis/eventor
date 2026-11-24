import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, type ReactElement } from 'react';

import PrivacyScreen from '@/app/account/privacy';
import TermsScreen from '@/app/account/terms';
import { createRoot } from '@/test/renderer';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: (styles: unknown) => styles },
  Platform: { select: (options: { default?: unknown }) => options.default, OS: 'ios' },
}));
jest.mock('expo-router', () => ({ router: {} }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@/components/screen-header', () => ({ ScreenHeader: 'ScreenHeader' }));
jest.mock('@/components/theme', () => ({ makeStyles: () => () => ({}) }));

let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot();
});

afterEach(async () => {
  await act(async () => root.unmount());
});

function textOf(element: { type: string; props: Record<string, unknown> }): string {
  if (element.props.children === undefined) return '';
  return String(element.props.children);
}

async function render(screen: ReactElement) {
  await act(async () => root.render(screen));
  const texts = root.container.queryAll((node) => node.type === 'Text');
  const allText = texts.map(textOf).join(' ');
  const headings = texts.filter((node) => node.props.accessibilityRole === 'header');
  return {
    texts,
    allText,
    headings,
    header: root.container.queryAll((node) => node.type === 'ScreenHeader')[0],
    scroll: root.container.queryAll((node) => node.type === 'ScrollView'),
  };
}

it('renders the Privacy and GDPR screen with the draft banner and accessible headings', async () => {
  const { header, allText, headings, scroll } = await render(<PrivacyScreen />);

  expect(header?.props.title).toBe('Privacy and GDPR');
  expect(allText).toContain('Draft, needs legal review');
  expect(allText).toContain('Ask chat');
  expect(allText).toContain('Contact details will be added before launch');
  expect(scroll.length).toBe(1);
  expect(headings.map((h) => h.props.children)).toEqual([
    'What this demo stores on this phone',
    'Ask chat',
    'Location',
    'Crowd levels',
    'Tickets',
    'Questions',
  ]);
});

it('renders the Terms and conditions screen with the draft banner and accessible headings', async () => {
  const { header, allText, headings, scroll } = await render(<TermsScreen />);

  expect(header?.props.title).toBe('Terms and conditions');
  expect(allText).toContain('Draft, needs legal review');
  expect(allText).toContain('Contact details will be added before launch');
  expect(scroll.length).toBe(1);
  expect(headings.map((h) => h.props.children)).toEqual([
    'The demo',
    'Your account',
    'Ask assistant',
    'Tickets',
    'Acceptable use',
    'Contact',
  ]);
});
