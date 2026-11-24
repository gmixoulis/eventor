import { describe, expect, it } from '@jest/globals';

import { rerank } from '@/matching/rerank';

function candidate(
  personId: string,
  p: number,
  extra: { text?: number[]; role?: string; impressions?: number } = {},
) {
  return {
    personId,
    p,
    text: extra.text,
    role: extra.role,
    impressions: extra.impressions ?? 0,
  };
}

describe('rerank', () => {
  it('never returns hidden people', () => {
    const scored = [candidate('a', 0.9), candidate('b', 0.8), candidate('c', 0.7)];
    const result = rerank(scored, { hidden: new Set(['b']), seed: 1 });
    expect(result.map((r) => r.personId)).not.toContain('b');
  });

  it('lowers a repeatedly shown person through fatigue', () => {
    const fresh = rerank([candidate('a', 0.9), candidate('b', 0.8)], { hidden: new Set(), seed: 1 });
    const tired = rerank(
      [candidate('a', 0.9, { impressions: 5 }), candidate('b', 0.8)],
      { hidden: new Set(), seed: 1 },
    );
    const freshA = fresh.find((r) => r.personId === 'a')!;
    const tiredA = tired.find((r) => r.personId === 'a')!;
    expect(tiredA.p).toBeLessThan(freshA.p);
  });

  it('diversifies the top ten when alternatives exist', () => {
    const sameText = [1, 0, 0];
    const scored = [
      ...Array.from({ length: 12 }, (_, i) => candidate(`same-${i}`, 0.9, { text: sameText })),
      candidate('diff-a', 0.5, { text: [0, 1, 0] }),
      candidate('diff-b', 0.5, { text: [0, 0, 1] }),
      candidate('diff-c', 0.5, { text: [1, 1, 0] }),
    ];
    const result = rerank(scored, { hidden: new Set(), seed: 1 });
    const top10 = result.slice(0, 10);
    const different = top10.filter((r) => r.personId.startsWith('diff-')).length;
    expect(different).toBeGreaterThanOrEqual(2);
  });

  it('fills the exploration slot deterministically for a fixed seed', () => {
    const scored = [
      ...Array.from({ length: 12 }, (_, i) => candidate(`high-${i}`, 0.9)),
      candidate('low-0', 0.3),
      candidate('mid-1', 0.5),
      candidate('mid-2', 0.7),
    ];
    const first = rerank(scored, { hidden: new Set(), seed: 42 });
    const second = rerank(scored, { hidden: new Set(), seed: 42 });
    expect(first).toEqual(second);
    const explore = first.filter((r) => r.explore);
    expect(explore).toHaveLength(1);
    expect(explore[0].personId).toBe('mid-1');
  });
});
