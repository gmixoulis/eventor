import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { resolveScheme, themeFor, themes, type AppearanceSetting, type Theme } from '@/constants/theme';
import { useDeviceSettings, useSettings } from '@/store';

const ThemeContext = createContext<Theme>(themes.light);

/** Resolves the active scheme from the Appearance setting and the device, and keeps native UI in step. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { appearance } = useSettings();
  const { event } = useDeviceSettings().device;
  const device = useColorScheme();
  const theme = themeFor(resolveScheme(appearance, device), event?.accent);

  useEffect(() => {
    applyNativeScheme(appearance);
  }, [appearance]);

  useEffect(() => {
    // Root view behind every screen: no white flash on push or sheet open in dark mode.
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {});
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Native surfaces (alerts, keyboards, form sheets, Android system bars) follow the app's choice.
 * Call it before saving a new setting too, so the render that follows reads the device scheme fresh.
 */
export function applyNativeScheme(appearance: AppearanceSetting) {
  Appearance.setColorScheme(appearance === 'light' || appearance === 'dark' ? appearance : 'auto');
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** One cached value per theme (scheme and event accent), built lazily on first use. */
export function cachePerTheme<T>(factory: (theme: Theme) => T): (theme: Theme) => T {
  const cache = new WeakMap<Theme, T>();
  return (theme) => {
    if (!cache.has(theme)) cache.set(theme, factory(theme));
    return cache.get(theme) as T;
  };
}

/**
 * `const useStyles = makeStyles(({ colors }) => StyleSheet.create({...}))` at module level, then
 * `const styles = useStyles()` in the component. Each scheme's StyleSheet is built once.
 */
export function makeStyles<T>(factory: (theme: Theme) => T): () => T {
  const get = cachePerTheme(factory);
  return function useStyles() {
    return get(useTheme());
  };
}
