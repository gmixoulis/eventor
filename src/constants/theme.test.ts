import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { cachePerTheme, makeStyles } from '@/components/theme';
import { stageColor } from '@/components/schedule/math';
import { ACCENT_COLORS, darkColors, lightColors, resolveScheme, themeFor, themes, type Palette, type Scheme } from '@/constants/theme';
import { ACCENTS } from '@/lib/event-setup';

// The provider reads settings from the store; these tests only need the pure parts.
jest.mock('@/store', () => ({ useSettings: () => ({ appearance: 'system' }) }));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Token = keyof Palette;
/** [foreground, background, minimum ratio]: 4.5 body text, 3 large text, icons and UI parts. */
const PAIRS: [Token, Token, number][] = [
  ['text', 'bg', 4.5], ['text', 'card', 4.5], ['text', 'surfaceRaised', 4.5], ['text', 'highlight', 4.5],
  ['text', 'primarySoft', 4.5], ['text', 'accentSoft', 4.5],
  ['textMuted', 'bg', 4.5], ['textMuted', 'card', 4.5], ['textMuted', 'surfaceRaised', 4.5], ['textMuted', 'highlight', 4.5],
  ['textMuted', 'skeleton', 3],
  ['primary', 'bg', 4.5], ['primary', 'card', 4.5], ['primary', 'primarySoft', 4.5],
  ['onPrimary', 'primary', 4.5], ['onPrimary', 'primaryPressed', 4.5],
  ['onAccent', 'accent', 4.5], ['onAccentSoft', 'accentSoft', 4.5],
  ['success', 'card', 4.5], ['success', 'successSoft', 4.5],
  ['warning', 'card', 4.5], ['warning', 'warningSoft', 4.5],
  ['danger', 'card', 4.5], ['danger', 'dangerSoft', 4.5],
  ['card', 'warning', 4.5], ['card', 'primary', 4.5],
  ['borderStrong', 'card', 1.5],
  ['onArt', 'artRed', 4.5], ['onArt', 'artPink', 4.5], ['onArt', 'artYellow', 4.5],
];

describe('palettes', () => {
  it('light and dark have exactly the same keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it.each(['light', 'dark'] as const)('%s pairs meet their WCAG minimum', (scheme) => {
    const colors = themes[scheme].colors;
    const failing = PAIRS.filter(([fg, bg, min]) => contrast(colors[fg], colors[bg]) < min)
      .map(([fg, bg, min]) => `${fg} on ${bg}: ${contrast(colors[fg], colors[bg]).toFixed(2)} < ${min}`);
    expect(failing).toEqual([]);
  });

  it.each(['light', 'dark'] as const)('%s stage tints keep text readable', (scheme) => {
    const { colors } = themes[scheme];
    for (const order of [1, 2, 3, 4]) {
      const { bg } = stageColor(order, scheme);
      expect(contrast(colors.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('event accents', () => {
  const cases = ACCENTS.flatMap((accent) => (['light', 'dark'] as const).map((scheme) => [accent.id, scheme] as const));

  it.each(cases)('%s in %s keeps every pair at its WCAG minimum, button text included', (accent, scheme) => {
    const colors = themeFor(scheme, accent).colors;
    const failing = PAIRS.filter(([fg, bg, min]) => contrast(colors[fg], colors[bg]) < min)
      .map(([fg, bg, min]) => `${fg} on ${bg}: ${contrast(colors[fg], colors[bg]).toFixed(2)} < ${min}`);
    expect(failing).toEqual([]);
    // Light buttons carry white text; dark buttons keep the palette's deep navy onPrimary.
    expect(colors.onPrimary).toBe(scheme === 'light' ? '#FFFFFF' : darkColors.onPrimary);
  });

  it('changes only primary, primaryPressed and primarySoft, and blue is the default palette', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(themeFor(scheme, 'blue')).toBe(themes[scheme]);
      expect(themeFor(scheme, null)).toBe(themes[scheme]);
      const base = themes[scheme].colors;
      const changed = Object.keys(base).filter((key) => themeFor(scheme, 'plum').colors[key as keyof Palette] !== base[key as keyof Palette]);
      expect(changed.sort()).toEqual(['primary', 'primaryPressed', 'primarySoft']);
      expect(themeFor(scheme, 'plum').colors.primary).toBe(ACCENT_COLORS.plum[scheme].primary);
    }
  });

  it('returns one stable theme per scheme and accent, so styles are rebuilt only when the accent changes', () => {
    expect(themeFor('light', 'teal')).toBe(themeFor('light', 'teal'));
    const get = cachePerTheme(({ colors }) => ({ button: { backgroundColor: colors.primary } }));
    expect(get(themeFor('light', 'teal')).button.backgroundColor).toBe(ACCENT_COLORS.teal.light.primary);
    expect(get(themes.light).button.backgroundColor).toBe(lightColors.primary);
    expect(get(themeFor('light', 'teal'))).toBe(get(themeFor('light', 'teal')));
  });
});

describe('resolveScheme', () => {
  it('system follows the device', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('light');
  });

  it('a forced setting wins over the device', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('treats an unknown stored value as system', () => {
    expect(resolveScheme('sepia' as never, 'dark')).toBe('dark');
  });
});

describe('makeStyles', () => {
  it('caches one value per scheme, built lazily', () => {
    const factory = jest.fn(({ colors }: { colors: Palette }) => ({ page: { backgroundColor: colors.bg } }));
    const get = cachePerTheme(factory);
    expect(factory).not.toHaveBeenCalled();
    const light = get(themes.light);
    expect(get(themes.light)).toBe(light);
    const dark = get(themes.dark);
    expect(dark).not.toBe(light);
    expect(get(themes.dark)).toBe(dark);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('the hook returns the same object for the same scheme and another across schemes', () => {
    let scheme: Scheme = 'light';
    const spy = jest.spyOn(React, 'useContext').mockImplementation(() => themes[scheme]);
    const useStyles = makeStyles(({ colors }) => ({ page: { backgroundColor: colors.bg } }));
    const first = useStyles();
    expect(useStyles()).toBe(first);
    expect(first.page.backgroundColor).toBe(lightColors.bg);
    scheme = 'dark';
    const second = useStyles();
    expect(second).not.toBe(first);
    expect(second.page.backgroundColor).toBe(darkColors.bg);
    spy.mockRestore();
  });
});
