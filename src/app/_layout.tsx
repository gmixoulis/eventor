import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Urbanist_700Bold, useFonts } from '@expo-google-fonts/urbanist';
import { DarkTheme, DefaultTheme, Redirect, Stack, ThemeProvider as NavigationThemeProvider, usePathname } from 'expo-router';
import { getFocusedRouteNameFromRoute } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AskFab } from '@/components/assistant/ask-fab';
import { AuthProvider } from '@/components/auth/auth-provider';
import { screenPath } from '@/components/auth/routes';
import { VisitorGate } from '@/components/auth/visitor-gate';
import { FeatureGate } from '@/components/feature-gate';
import { ReminderBanner } from '@/components/reminders/reminder-banner';
import { TabBar } from '@/components/tab-bar';
import { cachePerTheme, ThemeProvider, useTheme } from '@/components/theme';
import { EmbedderProvider } from '@/matching/embedder-provider';
import { StoreProvider, useSession } from '@/store';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { firstLaunch } = useSession();

  // The welcome and sign-in screens are always reachable; they are how a first launch gets in.
  // A visitor on a private route is not redirected: the Stack's screenLayout shows the VisitorGate there instead.
  const redirect = firstLaunch && pathname !== '/welcome' && pathname !== '/sign-in';

  return (
    <>
      {redirect ? <Redirect href="/welcome" /> : null}
      {children}
    </>
  );
}

// Navigator containers (stack cards, tab scenes) take the themed ground, so a push never flashes white in dark mode.
const navigationTheme = cachePerTheme(({ colors, scheme }) => {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: colors.primary, background: colors.bg, card: colors.card, text: colors.text, border: colors.border },
  };
});

function ThemedStack() {
  const reduced = useReducedMotion();
  const theme = useTheme();
  return (
    <NavigationThemeProvider value={navigationTheme(theme)}>
      {/* Dark icons on light, light icons on dark; the reels viewer mounts its own light StatusBar on top. */}
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <EmbedderProvider />
      <View style={[styles.column, { backgroundColor: theme.colors.bg }]}>
        {/*
          A nested provider measures its own frame: both platforms report only the part of the window inset the
          view overlaps. While the TabBar sits below, the Stack's bottom inset is 0 (useSafeAreaInsets and the native
          SafeAreaView both read this provider), so screens need no change; when the bar hides, the full inset returns.
        */}
        <SafeAreaProvider style={styles.column}>
          {/* Native transitions: an iOS-style push for stack screens (Android included), a fade under reduced motion. */}
          <Stack
            screenOptions={{ headerShown: false, animation: reduced ? 'fade' : 'ios_from_right' }}
            // Every screen passes through the feature and visitor gates; a group like (tabs) is judged by its focused tab.
            // A switched-off feature wins: there is no point asking a visitor to sign in to it.
            screenLayout={({ route, children }) => {
              const path = screenPath(route.name, getFocusedRouteNameFromRoute(route));
              return (
                <FeatureGate path={path}>
                  <VisitorGate path={path}>{children}</VisitorGate>
                </FeatureGate>
              );
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="activity"
              options={{
                presentation: 'formSheet',
                // The system sheet presentation animates itself; don't layer the push on top.
                animation: 'default',
                sheetAllowedDetents: [0.9],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="announcements"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen name="reels" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal', animation: 'fade' }} />
          </Stack>
        </SafeAreaProvider>
        <TabBar />
        <AskFab />
      </View>
      <ReminderBanner />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Urbanist_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <StoreProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthGuard>
            <ThemedStack />
          </AuthGuard>
        </AuthProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1 },
});
