import { FontAwesome5 } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/avatar';
import { encodeLead } from '@/components/meetings/lead';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { fullName } from '@/lib/format';
import { useEventName, useProfile } from '@/store';

/** The QR tab: the lead code is the hero, with the name above it. */
export function MyCode() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { profile } = useProfile();
  const name = fullName(profile);
  const eventName = useEventName();
  return (
    <ScrollView contentContainerStyle={styles.codeBody}>
      <Pressable
        style={styles.info}
        onPress={() =>
          Alert.alert(
            'What is this QR Code?',
            'Other attendees can scan this code with the festival app to save your contact details as a lead.',
          )
        }>
        <FontAwesome5 name="info-circle" size={13} color={colors.primary} />
        <Text style={styles.infoText}>What is this QR Code?</Text>
      </Pressable>
      <View style={styles.codeCard}>
        <Avatar name={name} size={48} shape="square" />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.caption}>
          {profile.company} · {profile.title}
        </Text>
        <Text style={styles.caption}>{eventName}</Text>
        <View style={[styles.qr, scheme === 'dark' && styles.qrOnDark]}>
          <QRCode value={encodeLead(profile)} size={220} />
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  codeBody: { padding: spacing.lg, gap: spacing.lg },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoText: { ...typeScale.label, color: colors.primary },
  codeCard: { alignItems: 'center', gap: spacing.sm },
  name: { ...typeScale.title, fontSize: 17, lineHeight: 22, color: colors.text, textAlign: 'center' },
  caption: { ...typeScale.caption, color: colors.textMuted, textAlign: 'center' },
  qr: { marginTop: spacing.lg },
  // Scanners need dark modules on a light quiet zone, so the code keeps a white card in dark mode.
  qrOnDark: { backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: radius.sm },
}));
