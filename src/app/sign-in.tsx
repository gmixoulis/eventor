import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountPicker } from '@/components/auth/account-picker';
import { CodeStep } from '@/components/auth/code-step';
import { DEMO_CODE } from '@/components/auth/code';
import { EmailStep } from '@/components/auth/email-step';
import { isSignedInOnlyRoute, safeNext } from '@/components/auth/routes';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { useSession } from '@/store';

// 20 dp icon + 12 dp slop on each side = 44 dp target.
const ICON_SLOP = 12;
const pressedDim = ({ pressed }: { pressed: boolean }) => (pressed ? { opacity: 0.5 } : null);

export default function SignInScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { accounts, signIn, isGuest, firstLaunch } = useSession();
  // Only someone already signed in (Account, Switch account) sees the profiles; everyone else signs in by email and code.
  const [switching] = useState(!isGuest);
  const [step, setStep] = useState<'email' | 'code' | 'accounts'>(switching ? 'accounts' : 'email');
  // The typed address lives only here, to show it on the code step: never stored, logged or sent.
  const [email, setEmail] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  // The demo code signs in as the first demo account (accounts are hydrated before any screen renders).
  const demoAccount = accounts.at(0);

  const finish = (id: string | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void signIn(id).then(() => {
      // A guest cannot open the route that sent them here; fall back to Home.
      const path = safeNext(next);
      const target = id === null && isSignedInOnlyRoute(path) ? '/' : path;
      // Pops back to the page that sent the user here when it is in the stack (the visitor gate, a guarded action),
      // otherwise replaces this screen; either way Back never returns to sign-in.
      router.dismissTo(target as Href);
    });
  };

  const back = () => {
    if (step === 'code') setStep('email');
    else if (router.canGoBack()) router.back();
    // First launch: Welcome replaced itself with this screen, so there is no history to pop.
    else router.replace(firstLaunch ? '/welcome' : '/');
  };

  // Android back follows the arrow, so the first-launch sign-in returns to Welcome instead of exiting.
  // An open help Sheet is a Modal and takes the press first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={back} hitSlop={ICON_SLOP} accessibilityRole="button" accessibilityLabel="Back" style={pressedDim}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        {step !== 'accounts' ? (
          <Pressable
            onPress={() => setHelpOpen(true)}
            hitSlop={ICON_SLOP}
            accessibilityRole="button"
            accessibilityLabel="About this demo sign-in"
            style={pressedDim}>
            <FontAwesome5 name="question-circle" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {step === 'email' ? (
        <EmailStep
          title={next ? 'Sign in to continue' : 'Sign in with your email'}
          initialEmail={email}
          onContinue={(value) => {
            setEmail(value);
            setStep('code');
          }}
          onVisitor={() => finish(null)}
        />
      ) : null}
      {step === 'code' ? (
        <CodeStep
          email={email}
          onVerified={() => {
            if (demoAccount) finish(demoAccount.id);
          }}
          onVisitor={() => finish(null)}
        />
      ) : null}
      {step === 'accounts' ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Choose a profile
            </Text>
            <Text style={styles.caption}>Each demo profile has its own schedule, matches and messages.</Text>
          </View>
          <AccountPicker accounts={accounts} onPick={finish} />
          <View style={styles.guest}>
            <Button label="Continue as a visitor" accessibilityLabel="Continue as a visitor" variant="ghost" onPress={() => finish(null)} />
          </View>
        </>
      ) : null}

      <Text style={styles.legal}>Demo build. Nothing you type here leaves this device.</Text>

      <Sheet visible={helpOpen} title="About this demo" onClose={() => setHelpOpen(false)}>
        <View style={styles.help}>
          <Text style={styles.helpLine}>This is a demo build of the festival app.</Text>
          <Text style={styles.helpLine}>
            Your email is only checked for its format. It is not stored or sent anywhere, and no code is sent to it.
          </Text>
          <Text style={styles.helpLine}>Demo build: the code is {DEMO_CODE}. It signs you in as the demo user.</Text>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg + spacing.xs,
  },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  title: { ...typeScale.title, color: colors.text },
  caption: { ...typeScale.body, color: colors.textMuted },
  guest: { alignItems: 'center', paddingTop: spacing.sm },
  legal: {
    ...typeScale.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  help: { gap: spacing.md },
  helpLine: { ...typeScale.body, color: colors.text },
}));
