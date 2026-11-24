import { describe, expect, it } from '@jest/globals';

import { SKY_KEYFRAMES, cityHour, tintAtHour } from '@/art/sky-light';
import { constellationLayout, minStarSpacing } from '@/art/constellation';
import { identitySpec, sharedLayers } from '@/art/identity';
import { meanderPath, meanderRing } from '@/art/meander';
import { WORDS, wordForDay } from '@/art/words';
import { darkColors, lightColors } from '@/constants/theme';

const ada = {
  id: 'ada',
  role: 'Startup',
  selections: [
    { interestId: 'group-industry-fintech', goalId: 'get-investment' },
    { interestId: 'group-industry-music', goalId: 'network' },
  ],
};
const ben = {
  id: 'ben',
  role: 'Investor',
  selections: [
    { interestId: 'group-industry-fintech', goalId: 'invest' },
    { interestId: 'group-industry-robotics', goalId: 'invest' },
    { interestId: 'group-industry-space-tech', goalId: 'invest' },
  ],
};

describe('identitySpec', () => {
  it('is deterministic', () => {
    expect(identitySpec(ada)).toEqual(identitySpec({ ...ada, selections: [...ada.selections] }));
  });

  it('differs between people', () => {
    const a = identitySpec(ada);
    const b = identitySpec(ben);
    expect(a).not.toEqual(b);
    expect(identitySpec({ ...ada, id: 'other' }).rotation).not.toBe(a.rotation);
  });

  it('gives a shared interest the same layer in the same place', () => {
    const a = identitySpec(ada);
    const b = identitySpec(ben);
    const shared = sharedLayers(a, b);
    expect(shared).toContain('interest:group-industry-fintech');
    const pick = (s: typeof a) => s.layers.find((l) => l.id === 'interest:group-industry-fintech');
    expect(pick(a)).toEqual(pick(b));
    expect(shared).not.toContain('interest:group-industry-music');
  });

  it('sharedLayers is symmetric', () => {
    const a = identitySpec(ada);
    const b = identitySpec(ben);
    expect(sharedLayers(a, b)).toEqual(sharedLayers(b, a));
  });

  it('uses two or three palette slots', () => {
    for (const p of [ada, ben, { id: 'x', selections: [] }]) {
      const n = Object.keys(identitySpec(p).palette).length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
});

describe('meanderPath', () => {
  it('starts and ends on the bottom line at both edges', () => {
    const m = meanderPath(200, 12, 4);
    expect(m.start).toEqual({ x: 0, y: 12 });
    expect(m.end).toEqual({ x: 200, y: 12 });
    expect(m.d.startsWith('M0 12')).toBe(true);
    expect(m.d.endsWith('L200 12')).toBe(true);
  });

  it('grows in length with width', () => {
    expect(meanderPath(300, 12, 4).length).toBeGreaterThan(meanderPath(200, 12, 4).length);
    expect(meanderPath(300, 20, 4, 2).length).toBeGreaterThan(meanderPath(120, 20, 4, 2).length);
  });

  it('ring closes on itself', () => {
    const ring = meanderRing(50, 50, 48, 40, 12, 2);
    expect(ring.end.x).toBeCloseTo(ring.start.x, 6);
    expect(ring.end.y).toBeCloseTo(ring.start.y, 6);
    expect(ring.d.endsWith('Z')).toBe(true);
  });
});

describe('constellationLayout', () => {
  const kinds = ['talk', 'stand', 'workshop', 'side'];
  const targets = Array.from({ length: 24 }, (_, i) => ({ id: `t${i}`, kind: kinds[i % kinds.length] }));

  it('is deterministic for a seed', () => {
    expect(constellationLayout(targets, 'seed', 320, 400)).toEqual(constellationLayout(targets, 'seed', 320, 400));
    expect(constellationLayout(targets, 'other', 320, 400)).not.toEqual(constellationLayout(targets, 'seed', 320, 400));
  });

  it('keeps stars inside the bounds and spaced apart', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const layout = constellationLayout(targets, seed, 320, 400);
      expect(layout.stars).toHaveLength(24);
      for (const s of layout.stars) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(320);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(400);
      }
      expect(minStarSpacing(layout)).toBeGreaterThan(20);
    }
  });

  it('links only existing stars of one group, without duplicates', () => {
    const layout = constellationLayout(targets, 'seed', 320, 400);
    const byId = new Map(layout.stars.map((s) => [s.id, s]));
    const keys = new Set<string>();
    for (const l of layout.links) {
      expect(byId.get(l.from)?.kind).toBe(l.group);
      expect(byId.get(l.to)?.kind).toBe(l.group);
      const key = [l.from, l.to].sort().join('>');
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    expect(layout.links).toHaveLength(24 - kinds.length);
  });
});

// New York is UTC-5 in winter (EST) and UTC-4 in summer (EDT).
function cityDate(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2027, 0, 15, hour + 5, minute));
}

describe('New York light', () => {
  it('resolves by New York time whatever zone the date was written in', () => {
    // 12:30 in Athens (UTC+2 in January) is 05:30 in New York (UTC-5).
    const date = new Date('2027-01-15T12:30:00+02:00');
    expect(cityHour(date)).toBeCloseTo(5.5, 5);
    // Summer time: 10:00 UTC is 06:00 in New York (UTC-4).
    expect(cityHour(new Date('2027-07-01T10:00:00Z'))).toBeCloseTo(6, 5);
  });

  it('changes only slightly from one minute to the next', () => {
    for (let m = 0; m < 24 * 60; m++) {
      const ta = tintAtHour(cityHour(cityDate(0, m)));
      const tb = tintAtHour(cityHour(cityDate(0, m + 1)));
      for (let i = 0; i < 3; i++) expect(Math.abs(ta[i] - tb[i])).toBeLessThanOrEqual(2);
      expect(Math.abs(ta[3] - tb[3])).toBeLessThanOrEqual(0.002);
    }
  });

  it('keeps text and textMuted at AA over every tint in both themes', () => {
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    for (const palette of [lightColors, darkColors]) {
      const bg = hex(palette.bg);
      for (const k of SKY_KEYFRAMES) {
        const [r, g, b, a] = k.tint;
        const ground = [r, g, b].map((c, i) => c * a + bg[i] * (1 - a));
        expect(ratio(hex(palette.text), ground)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(hex(palette.textMuted), ground)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('words', () => {
  it('has 21 unique, complete entries', () => {
    expect(WORDS).toHaveLength(21);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(21);
    for (const w of WORDS) {
      for (const value of Object.values(w)) expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('picks deterministically and covers every word across a year', () => {
    const day = new Date('2027-03-10T12:00:00Z');
    expect(wordForDay(day)).toBe(wordForDay(new Date(day)));
    const seen = new Set<string>();
    for (let d = 0; d < 365; d++) seen.add(wordForDay(new Date(Date.UTC(2027, 0, 1, 10) + d * 86400000)).id);
    expect(seen.size).toBe(21);
  });
});
