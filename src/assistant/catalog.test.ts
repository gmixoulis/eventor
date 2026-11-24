import { expect, it, jest } from '@jest/globals';

import { entities, scheduleFact } from '@/assistant/catalog';

jest.mock('@/data', () => ({
  ...jest.requireActual<typeof import('@/data')>('@/data'),
  listTracks: () => [],
}));

it('uses a bold title, compact day and consistent time range without repeating the title', () => {
  const item = entities.find((entity) => entity.source.id === 'se-ai-workshop')!.agenda!;
  expect(scheduleFact(item)).toBe('**Prompt Engineering Workshop**, Thu 28 May, 14:00 to 15:30, The High Line Room');
});

it('omits the track clause when the session has no matching track', () => {
  const session = entities.find((entity) => entity.source.id === 's-openai-for-startups')!;
  expect(session.facts[2]).toBe('Company 7 for Startups features Speaker 10.');
  expect(entities.flatMap((entity) => entity.facts).join('\n')).not.toContain('in the  track');
});
