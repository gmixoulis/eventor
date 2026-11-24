import { FontAwesome5 } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IdentityHeader } from '@/components/art/identity-header';
import { useMyIdentity } from '@/components/art/use-identity';
import { Pill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { Row, RowGroup } from '@/components/row';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { eventTimeLabel, fullName } from '@/lib/format';
import { useEventClock, useEventName, useProfile, useSession, useSettings } from '@/store';

export default function AccountScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile, updateProfile } = useProfile();
  const { account, signOut, resetDemoData, deleteAccount } = useSession();
  const name = fullName(profile);
  const spec = useMyIdentity();
  const signedInAs = account ? fullName(account) : name;
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const { now, isDemo } = useEventClock();
  const { use24h } = useSettings();
  const eventName = useEventName();
  const eventTime = eventTimeLabel(now, use24h);

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/'));
        },
      },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete account',
      'This restores your demo account to its starting state and signs you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteAccount().then(() => router.replace('/'));
          },
        },
      ],
    );

  const confirmReset = () =>
    Alert.alert('Reset demo data', 'Restore every demo account to its starting state?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void resetDemoData() },
    ]);

  const rejoin = () =>
    Alert.alert('Start join process again', 'Rejoin to change your preferences.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => router.push('/onboarding') },
    ]);

  const setNetworking = (on: boolean) => {
    if (on) {
      updateProfile({ networking: true });
      return;
    }
    Alert.alert('Turn off networking?', "You will be hidden from other attendees' matches.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Turn off', style: 'destructive', onPress: () => updateProfile({ networking: false }) },
    ]);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="Account" variant="stack" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileBlock}>
          <IdentityHeader spec={spec} name={name} role={profile.role} title={profile.title} company={profile.company}
            avatarBadge={<View style={styles.cameraBadge}>
              <FontAwesome5 name="camera" solid size={10} color={colors.textMuted} />
            </View>} />
        </View>

        <RowGroup title="Demo">
          <Row icon="clock" title="Event time" subtitle={eventTime}
            accessibilityLabel={`Event time, ${eventTime}${isDemo ? ', Demo' : ''}`}
            aside={isDemo ? <Pill tone="neutral" label="Demo" /> : undefined}
            onPress={() => router.push('/event-time')} />
          <Row
            icon="users"
            title="Switch account"
            subtitle={`Signed in as ${signedInAs}`}
            onPress={() => router.push('/sign-in')}
          />
          <Row icon="undo" title="Reset demo data" onPress={confirmReset} />
          <Row icon="palette" title="Art lab" subtitle="Every piece of the app's art kit" onPress={() => router.push('/art-lab')} />
        </RowGroup>

        <RowGroup title="Event settings" caption={`For ${eventName}`}>
          <Row
            icon="user-friends"
            title="View Profile"
            subtitle="See how my profile looks to others"
            onPress={() => router.push('/account/profile')}
          />
          <Row
            icon="id-card"
            title="Edit event information"
            subtitle="Introduction, event role, etc."
            onPress={() => router.push('/account/event-info')}
          />
          <Row
            icon="star"
            title="Edit my interests"
            onPress={() => router.push('/account/interests')}
          />
          <Row
            icon="clock"
            title="Edit my availability"
            onPress={() => router.push('/account/availability')}
          />
          {/* Row has no trailing slot, so this switch row mirrors its layout. */}
          <PressableScale
            feedback="highlight"
            onPress={() => setNetworking(!profile.networking)}
            accessibilityRole="switch"
            accessibilityLabel="Networking, appear in matches and receive meeting requests"
            accessibilityState={{ checked: profile.networking }}
            style={styles.switchRow}>
            <View style={styles.switchIcon}>
              <FontAwesome5 name="handshake" solid size={15} color={colors.textMuted} />
            </View>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Networking</Text>
              <Text style={styles.switchSubtitle}>Appear in matches and receive meeting requests</Text>
            </View>
            <Switch
              value={profile.networking}
              onValueChange={setNetworking}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </PressableScale>
          <Row
            icon="sync-alt"
            title="Start join process again"
            subtitle="Rejoin to change my preferences"
            onPress={rejoin}
          />
        </RowGroup>

        <RowGroup title="Account settings" caption="Applies to all events">
          <Row
            icon="user-edit"
            title="Personal information"
            subtitle={account?.email || undefined}
            onPress={() => router.push('/account/personal')}
          />
          <Row
            icon="briefcase"
            title="Company information"
            onPress={() => router.push('/account/company')}
          />
          <Row
            icon="address-book"
            title="Social media"
            onPress={() => router.push('/account/social')}
          />
        </RowGroup>

        <RowGroup>
          <Row icon="lock" title="Password" onPress={() => router.push('/account/password')} />
          <Row icon="eye-slash" title="Hidden people" onPress={() => router.push('/account/blocked')} />
        </RowGroup>

        <RowGroup>
          <Row icon="bell" title="Notifications" onPress={() => router.push('/account/notifications')} />
          <Row icon="calendar-day" title="Date & time" onPress={() => router.push('/account/date-time')} />
          <Row icon="adjust" title="Appearance" onPress={() => router.push('/account/appearance')} />
          <Row icon="database" title="App cache" onPress={() => router.push('/account/cache')} />
          <Row
            icon="info-circle"
            title="App version"
            subtitle={version}
            onPress={() => router.push('/account/version')}
          />
          <Row
            icon="shield-alt"
            title="Privacy and GDPR"
            onPress={() => router.push('/account/privacy')}
          />
          <Row
            icon="file-contract"
            title="Terms and conditions"
            onPress={() => router.push('/account/terms')}
          />
        </RowGroup>

        <RowGroup>
          <Row icon="sign-out-alt" title="Log out" onPress={confirmLogout} />
          <Row
            icon="trash-alt"
            title="Delete account"
            subtitle="This is permanent"
            danger
            onPress={confirmDelete}
          />
        </RowGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  switchRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  switchIcon: { width: 20, alignItems: 'center' },
  switchText: { flex: 1 },
  switchTitle: { ...typeScale.label, color: colors.text },
  switchSubtitle: { ...typeScale.caption, color: colors.textMuted },
  scroll: { paddingBottom: spacing.xl },
  profileBlock: { padding: spacing.lg, paddingBottom: 0 },
  cameraBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
