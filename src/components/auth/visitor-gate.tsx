import { router, usePathname, useSegments } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gatePath, isOrganizerRouteAllowed, isSignedInOnlyRoute } from '@/components/auth/routes';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { tabSwitch } from '@/components/tabs';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';
import { useOrganizerRole, useSession } from '@/store';

type Props = {
  /** The path this screen stands for (see screenPath); decides whether it is private. */
  path: string;
  children: ReactElement;
};

/** Back to Home from a locked screen: on a locked tab it is a tab jump; dismissTo only works from a pushed screen (see tabSwitch). */
export function backToHome(pathname: string) {
  if (tabSwitch(pathname, '/') === 'jump') router.navigate('/');
  else router.dismissTo('/');
}

/**
 * Root Stack screen layout: a visitor on a private route sees this page instead of the screen.
 * The private screen is not mounted at all, so nothing of it renders or reaches a screen reader.
 */
export function VisitorGate({ path, children }: Props) {
  const styles = useStyles();
  const { isGuest } = useSession();
  // usePathname/useSegments track the focused tab live, so the gate re-decides on a tab change even when the
  // screen layout keeps the stale `path` snapshot. The pathname is also the exact route (with params) to return to.
  const pathname = usePathname();
  const segments = useSegments();
  const role = useOrganizerRole();
  const gated = gatePath(path, pathname, segments);

  // Signed in without the organizer role a tool needs (admin-only screens, or no side event to look after).
  if (!isGuest && !isOrganizerRouteAllowed(gated, role)) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.page}>
        <EmptyState icon="lock-outline" illustrated title="Organizers only"
          body="This part is for the app admin and the people looking after a side event." />
        <View style={styles.actions}>
          <Button label="Back to Home" accessibilityLabel="Back to Home" onPress={() => backToHome(pathname)} />
        </View>
      </SafeAreaView>
    );
  }
  if (!isGuest || !isSignedInOnlyRoute(gated)) return children;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.page}>
      <EmptyState
        icon="lock-outline"
        illustrated
        title="Sign in to continue"
        body="This part is personal: your schedule, meetings, passport and profile. It needs an account."
      />
      <View style={styles.actions}>
        <Button
          label="Sign in"
          accessibilityLabel="Sign in"
          onPress={() => router.push({ pathname: '/sign-in', params: { next: pathname } })}
        />
        <Button label="Back to Home" accessibilityLabel="Back to Home" variant="ghost" onPress={() => backToHome(pathname)} />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg },
  actions: { paddingHorizontal: spacing.xl, gap: spacing.md, alignItems: 'center' },
}));
