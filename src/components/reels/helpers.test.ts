import { describe, expect, it } from '@jest/globals';

import { activeIndex, clipLength, inPlayerWindow, likeCount } from '@/components/reels/helpers';
import { getPerson } from '@/data';
import { listReels } from '@/data/reels';

describe('reel helpers', () => {
  it('formats durations as m:ss', () => {
    expect(clipLength(60)).toBe('1:00');
    expect(clipLength(8)).toBe('0:08');
    expect(clipLength(725)).toBe('12:05');
    expect(clipLength(59.6)).toBe('1:00');
    expect(clipLength(-3)).toBe('0:00');
  });

  it('picks the item nearest the scroll offset, clamped', () => {
    expect(activeIndex(0, 142, 6)).toBe(0);
    expect(activeIndex(70, 142, 6)).toBe(0);
    expect(activeIndex(72, 142, 6)).toBe(1);
    expect(activeIndex(142 * 3, 142, 6)).toBe(3);
    expect(activeIndex(99999, 142, 6)).toBe(5);
    expect(activeIndex(-40, 142, 6)).toBe(0);
    expect(activeIndex(100, 0, 6)).toBe(0);
  });

  it('selects the last fully visible card at the carousel end, including overscroll', () => {
    // Six 132 dp cards, 10 dp gaps and 16 dp padding on each side.
    const content = 874;
    expect(activeIndex(0, 142, 6, 390, content)).toBe(0);
    expect(activeIndex(284, 142, 6, 390, content)).toBe(2);
    expect(activeIndex(480, 142, 6, 390, content)).toBe(3);
    expect(activeIndex(484, 142, 6, 390, content)).toBe(5);
    expect(activeIndex(500, 142, 6, 390, content)).toBe(5);
  });

  it('keeps the first card active when the whole list fits in the viewport', () => {
    expect(activeIndex(0, 142, 2, 390, 306)).toBe(0);
    expect(activeIndex(100, 142, 2, 390, 306)).toBe(0);
    expect(activeIndex(0, 142, 2, 306, 306)).toBe(0);
    expect(activeIndex(0, 142, 1, 390, 164)).toBe(0);
    expect(activeIndex(0, 142, 0, 390, 32)).toBe(0);
  });

  it('keeps at most three players: current, previous and next', () => {
    const mounted = (active: number, count: number) =>
      Array.from({ length: count }, (_, i) => i).filter((i) => inPlayerWindow(i, active, count));
    expect(mounted(0, 6)).toEqual([0, 1]);
    expect(mounted(3, 6)).toEqual([2, 3, 4]);
    expect(mounted(5, 6)).toEqual([4, 5]);
    expect(mounted(0, 1)).toEqual([0]);
    for (let a = 0; a < 6; a++) expect(mounted(a, 6).length).toBeLessThanOrEqual(3);
  });

  it('adds the user like to the base count', () => {
    expect(likeCount(214, false)).toBe(214);
    expect(likeCount(214, true)).toBe(215);
  });
});

describe('reels data', () => {
  it('links six reels to startup founders with short pitches', () => {
    const reels = listReels();
    expect(reels).toHaveLength(6);
    for (const r of reels) {
      expect(getPerson(r.founderId)?.role).toBe('Startup');
      expect(r.poster).toBeDefined();
      expect(r.pitch.length).toBeLessThanOrEqual(90);
      expect(r.tags.length).toBeGreaterThanOrEqual(2);
      expect(r.tags.length).toBeLessThanOrEqual(3);
    }
    expect(new Set(reels.map((r) => r.id)).size).toBe(6);
  });
});
