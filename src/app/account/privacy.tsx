import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What this demo stores on this phone',
    body: 'Your profile, preferences, tickets and any demo account data are stored only on this device. Nothing here is shared with other attendees.',
  },
  {
    title: 'Ask chat',
    body: 'When you ask the Ask assistant a question, the question is sent to the assistant server so it can answer. No account data is attached to the question.',
  },
  {
    title: 'Location',
    body: 'Location is optional. The app only reads your position while the venue map is open. It is not stored and it is not shared.',
  },
  {
    title: 'Crowd levels',
    body: 'Crowd levels shown on the map are simulated demo data. They do not reflect real occupancy.',
  },
  {
    title: 'Tickets',
    body: 'Ticket purchase is a mock checkout for the demo. No real payment is taken and no real tickets are issued.',
  },
  {
    title: 'Questions',
    body: 'Contact details will be added before launch.',
  },
];

export default function PrivacyScreen() {
  const styles = useStyles();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="Privacy and GDPR" variant="stack" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Draft, needs legal review</Text>
        </View>
        <Text style={styles.intro}>
          This is the demo app for the Eventor Festival. This screen describes what the demo
          does with your data. It is a draft and needs legal review before launch.
        </Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  banner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  bannerText: { ...typeScale.label, color: colors.warning },
  intro: { ...typeScale.body, color: colors.textMuted, marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typeScale.section, color: colors.text, marginBottom: spacing.xs },
  body: { ...typeScale.body, color: colors.text },
}));
