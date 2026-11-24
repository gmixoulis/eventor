import { describe, expect, it } from '@jest/globals';

import { agendaKey, type AgendaItem } from '@/lib/agenda-item';
import { recommendAgenda } from '@/matching/agenda-recs';
import { lexicalEmbedder } from '@/matching/embedder';

function item(id: string): AgendaItem {
  return {
    key: agendaKey('session', id),
    kind: 'session',
    id,
    title: id,
    day: '2026-05-28',
    startTime: '10:00',
    endTime: '10:30',
    place: 'Stage',
  };
}

const corpus = [
  'fintech payments banking',
  'robotics warehouse automation',
  'travel marketplace tourism',
  'media journalism news',
  'music arts culture',
];

describe('recommendAgenda', () => {
  it('ranks the item sharing an interest highest, with a matching reason', async () => {
    const embed = lexicalEmbedder(corpus);
    const items = [
      { item: item('s1'), text: 'A talk on payments and fintech infrastructure', interestIds: ['group-industry-fintech'] },
      { item: item('s2'), text: 'Warehouse robots and automation', interestIds: ['group-industry-robotics'] },
    ];
    const recs = await recommendAgenda(
      'Seed investor focused on fintech',
      ['group-industry-fintech'],
      items,
      embed,
    );
    expect(recs[0].key).toBe(agendaKey('session', 's1'));
    expect(recs[0].reason).toMatch(/Fintech/);
  });

  it('returns one result per input, sorted by descending score', async () => {
    const embed = lexicalEmbedder(corpus);
    const items = [
      { item: item('s1'), text: 'fintech fintech fintech', interestIds: [] },
      { item: item('s2'), text: 'unrelated topic', interestIds: [] },
    ];
    const recs = await recommendAgenda('fintech investor', [], items, embed);
    expect(recs).toHaveLength(2);
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[1].score);
  });

  it('gives no reason without a shared interest or a close text match', async () => {
    const embed = lexicalEmbedder(corpus);
    const items = [{ item: item('s1'), text: 'music arts culture', interestIds: [] }];
    const recs = await recommendAgenda('fintech investor', [], items, embed);
    expect(recs[0].reason).toBeNull();
  });
});
