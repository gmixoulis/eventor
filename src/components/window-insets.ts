import { initialWindowMetrics } from 'react-native-safe-area-context';

/**
 * Safe-area insets of the whole window, captured once at app start.
 * Full-window Modals must use these: useSafeAreaInsets() inside them reads the root layout's
 * nested provider, whose bottom inset is 0 while the tab bar is shown (the bar owns that inset).
 * The app is portrait-locked (app.json), so this startup snapshot never goes stale. Null on web -> 0.
 */
export const windowInsets = initialWindowMetrics?.insets ?? { top: 0, left: 0, right: 0, bottom: 0 };
