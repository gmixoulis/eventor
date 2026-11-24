/**
 * Design tokens. Two palettes with identical keys; components read the active one through
 * `useTheme()` / `makeStyles()` in src/components/theme.tsx. Fonts are loaded in the root layout.
 * Contrast: every text token meets WCAG AA (4.5:1) on bg, card and highlight in its own palette
 * (checked in theme.test.ts); `accent` is a fill only, always paired with `onAccent` text.
 */
import { Platform, type ViewStyle } from 'react-native';

import type { AccentId } from '@/lib/event-setup';

export type Scheme = 'light' | 'dark';
export type AppearanceSetting = 'system' | Scheme;

export const lightColors = {
  // Neutrals
  bg: '#F5F6F8',
  card: '#FFFFFF',
  /** Floating surfaces (sheets, FABs): white, separated by `shadow.raised` rather than a tint. */
  surfaceRaised: '#FFFFFF',
  /** Image and avatar placeholder ground. */
  skeleton: '#E6E9EE',
  /** Pressed background for full-width rows. */
  highlight: '#EEF1F5',
  border: '#E3E6EB',
  borderStrong: '#CBD1D9',
  text: '#141922',
  textMuted: '#5B6472',
  overlay: 'rgba(15, 20, 30, 0.45)',
  /** Switch thumb: stays light in both themes, like the platform switches. */
  switchThumb: '#FFFFFF',

  // Brand
  primary: '#2648D1',
  primaryPressed: '#1D39AB',
  primarySoft: '#E7ECFD',
  onPrimary: '#FFFFFF',
  /** Warm highlight (sun yellow), used sparingly: the unread announcements bubble. */
  accent: '#FFC53D',
  accentSoft: '#FFF3CC',
  onAccent: '#3A2A00',
  /** Text and icons on `accentSoft`. */
  onAccentSoft: '#3A2A00',

  // Semantic
  pendingText: '#8A6100',
  acceptedText: '#1B7A3D',
  success: '#1B7A3D',
  successSoft: '#DDF5E4',
  warning: '#8A6100',
  warningSoft: '#FFF4D6',
  danger: '#C42634',
  dangerSoft: '#FDE8E9',

  // Schedule: three stage tints, then the side-event tint.
  stage1Bg: '#FDECEC',
  stage1Border: '#E99A9A',
  stage2Bg: '#FDF0E3',
  stage2Border: '#EDB983',
  stage3Bg: '#FDFBD9',
  stage3Border: '#D9D25A',
  sideEventBg: '#FFFBE0',
  sideEventBorder: '#E3DB00',

  // The welcome art's colours (src/components/auth/welcome-art.tsx), as shapes and blocks on Home,
  // section headers and empty states. Fills only: never text on white; anything on them uses `onArt`.
  artRed: '#FF2A1A',
  artPink: '#FFA0F0',
  artYellow: '#FFF000',
  onArt: '#111111',
} as const;

export type Palette = { [K in keyof typeof lightColors]: string };

/**
 * Dark palette: near-black neutral ground, surfaces step lighter instead of casting shadows,
 * primary lifted to keep contrast, soft tints darkened, the sun-yellow accent kept.
 */
export const darkColors: Palette = {
  // Neutrals
  bg: '#0E1014',
  card: '#181B21',
  surfaceRaised: '#21252D',
  skeleton: '#2A2F38',
  highlight: '#262A32',
  border: '#2C313A',
  borderStrong: '#4A5260',
  text: '#ECEEF2',
  textMuted: '#A3AAB6',
  overlay: 'rgba(0, 0, 0, 0.6)',
  switchThumb: '#E8EAEE',

  // Brand
  primary: '#8EA6FF',
  primaryPressed: '#7590F5',
  primarySoft: '#1D2645',
  onPrimary: '#0A1233',
  accent: '#FFC53D',
  accentSoft: '#3A2F12',
  onAccent: '#3A2A00',
  onAccentSoft: '#FFD36B',

  // Semantic
  pendingText: '#F2C55C',
  acceptedText: '#72D894',
  success: '#72D894',
  successSoft: '#133524',
  warning: '#F2C55C',
  warningSoft: '#3A2E10',
  danger: '#FF8A93',
  dangerSoft: '#3D1C20',

  // Deep stage tints with brighter borders, so text stays readable.
  stage1Bg: '#3A1F23',
  stage1Border: '#C86A70',
  stage2Bg: '#392A1C',
  stage2Border: '#C98D52',
  stage3Bg: '#34321C',
  stage3Border: '#B5AC45',
  sideEventBg: '#36321A',
  sideEventBorder: '#C4B825',

  // A touch deeper so the blocks do not glare on near-black; black text still clears AA on each.
  artRed: '#F0402F',
  artPink: '#E58FD8',
  artYellow: '#EDE000',
  onArt: '#111111',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Radius by level: lg for the one block that leads a page, md for a tappable card, sm for controls, xs for status pills; rows have none. */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export type ShadowSet = { card: ViewStyle; raised: ViewStyle };

/** Two elevation presets. iOS uses shadow props, Android uses elevation (both need an opaque background). */
export const lightShadow: ShadowSet = {
  card: Platform.select({
    ios: {
      shadowColor: '#0F141E',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    default: { elevation: 1 },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#0F141E',
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 8 },
  }),
};

/** Shadows barely show on dark: cards rely on the lighter surface, floating surfaces keep a soft black shadow. */
export const darkShadow: ShadowSet = {
  card: Platform.select({ ios: { shadowOpacity: 0 }, default: { elevation: 0 } }) as ViewStyle,
  raised: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 8 },
  }),
};

export type Theme = { colors: Palette; shadow: ShadowSet; scheme: Scheme };

export const themes: Record<Scheme, Theme> = {
  light: { colors: lightColors, shadow: lightShadow, scheme: 'light' },
  dark: { colors: darkColors, shadow: darkShadow, scheme: 'dark' },
};

type AccentTokens = Pick<Palette, 'primary' | 'primaryPressed' | 'primarySoft'>;

/**
 * The event setup form's 6 action colours, light and dark. Only these three tokens change; `onPrimary` stays
 * (white on light, deep navy on dark), and every pair in theme.test.ts holds for each accent in both themes.
 */
export const ACCENT_COLORS: Record<AccentId, Record<Scheme, AccentTokens>> = {
  blue: {
    light: { primary: lightColors.primary, primaryPressed: lightColors.primaryPressed, primarySoft: lightColors.primarySoft },
    dark: { primary: darkColors.primary, primaryPressed: darkColors.primaryPressed, primarySoft: darkColors.primarySoft },
  },
  terracotta: {
    light: { primary: '#A8431D', primaryPressed: '#8A3517', primarySoft: '#FBE9E2' },
    dark: { primary: '#F2A383', primaryPressed: '#E88D69', primarySoft: '#3D2419' },
  },
  forest: {
    light: { primary: '#2A6B3C', primaryPressed: '#21552F', primarySoft: '#E3F1E6' },
    dark: { primary: '#80D196', primaryPressed: '#66BC7E', primarySoft: '#16301F' },
  },
  plum: {
    light: { primary: '#7A3E8F', primaryPressed: '#613172', primarySoft: '#F3E8F7' },
    dark: { primary: '#D6A6E8', primaryPressed: '#C78FDC', primarySoft: '#33213B' },
  },
  ink: {
    light: { primary: '#2B3445', primaryPressed: '#1C2331', primarySoft: '#E6E9EF' },
    dark: { primary: '#BAC4D8', primaryPressed: '#A3AFC6', primarySoft: '#252B36' },
  },
  teal: {
    light: { primary: '#0D6A70', primaryPressed: '#0A5459', primarySoft: '#DFF2F2' },
    dark: { primary: '#70D2D6', primaryPressed: '#55BFC4', primarySoft: '#12313A' },
  },
};

const accented: Partial<Record<string, Theme>> = {};

/** The scheme's theme with an event accent; one stable object per pair, so per-theme style caches stay valid. */
export function themeFor(scheme: Scheme, accent: AccentId | null | undefined): Theme {
  if (!accent || accent === 'blue') return themes[scheme];
  const base = themes[scheme];
  return (accented[`${scheme}:${accent}`] ??= { ...base, colors: { ...base.colors, ...ACCENT_COLORS[accent][scheme] } });
}

/** The user's appearance setting wins; 'system' follows the device and falls back to light when unknown. */
export function resolveScheme(appearance: AppearanceSetting, device: string | null | undefined): Scheme {
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return device === 'dark' ? 'dark' : 'light';
}

export const fonts = {
  heading: 'Urbanist_700Bold',
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemibold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

export const typeScale = {
  title: { fontSize: 24, lineHeight: 30, fontFamily: fonts.heading },
  section: { fontSize: 18, lineHeight: 24, fontFamily: fonts.heading },
  header: { fontSize: 17, lineHeight: 22, fontFamily: fonts.heading },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fonts.sansSemibold },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.sans },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.sans },
  mono: { fontSize: 12, lineHeight: 16, fontFamily: fonts.mono },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.sansMedium,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
} as const;

/**
 * Motion tokens. Easing values are cubic-bezier control points: pass them to
 * `Easing.bezier(...)` for withTiming or `cubicBezier(...)` for Reanimated CSS animations.
 */
export const motion = {
  duration: {
    press: 120,
    fast: 180,
    enter: 260,
    exit: 200,
  },
  easing: {
    out: [0.23, 1, 0.32, 1],
    inOut: [0.77, 0, 0.175, 1],
    sheet: [0.32, 0.72, 0, 1],
  },
  spring: {
    /** Settle with no overshoot: press release, sheet opening. */
    settle: { duration: 300, dampingRatio: 1 },
    /** Snap back after a drag; pass the gesture velocity alongside. */
    snap: { duration: 400, dampingRatio: 0.8 },
  },
  /** List entrance: rise distance in dp and a capped stagger. */
  rise: 8,
  stagger: { step: 40, maxItems: 6 },
} as const;
