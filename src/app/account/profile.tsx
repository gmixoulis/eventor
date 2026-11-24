import { FontAwesome5 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IdentityHeader } from '@/components/art/identity-header';
import { useMyIdentity } from '@/components/art/use-identity';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { fullName } from '@/lib/format';
import { useProfile } from '@/store';

export default function ProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const name = fullName(profile);
  const spec = useMyIdentity();

  const openLinkedIn = () => {
    if (profile.social.linkedin) void WebBrowser.openBrowserAsync(profile.social.linkedin);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="" variant="stack" />
      <ScrollView contentContainerStyle={styles.content}>
        <IdentityHeader spec={spec} name={name} role={profile.role} title={profile.title} company={profile.company} animated />

        {profile.social.linkedin ? (
          <Pressable style={styles.linkedinPill} onPress={openLinkedIn}>
            <FontAwesome5 name="linkedin" size={14} color={colors.primary} />
            <Text style={styles.linkedinText}>LinkedIn</Text>
          </Pressable>
        ) : null}

        {profile.intro ? <Text style={styles.intro}>{profile.intro}</Text> : null}

        {profile.countries.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.label}>Operates in</Text>
            <Text style={styles.cardText}>{profile.countries.join(', ')}</Text>
          </View>
        ) : null}

        {profile.industry ? (
          <View style={styles.block}>
            <Text style={styles.label}>Industry</Text>
            <Text style={styles.cardText}>{profile.industry}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  linkedinPill: {
    height: 30,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  linkedinText: { ...typeScale.caption, color: colors.primary },
  intro: { ...typeScale.body, color: colors.text },
  block: { gap: spacing.xs, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { ...typeScale.caption, color: colors.textMuted },
  cardText: { ...typeScale.body, color: colors.text },
}));
