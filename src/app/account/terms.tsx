import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'The demo',
    body: 'This is a working demonstration for the Eventor Festival. Features may change or be removed, and demo data may be reset at any time.',
  },
  {
    title: 'Your account',
    body: 'Your profile and preferences are stored only on this device.',
  },
  {
    title: 'Ask assistant',
    body: 'Questions you ask the Ask assistant are sent to the assistant server. No account data is attached.',
  },
  {
    title: 'Tickets',
    body: 'Ticket purchase is a mock checkout. No payment is taken and no real tickets are issued.',
  },
  {
    title: 'Acceptable use',
    body: "Use the demo for its intended purpose of trying the Eventor Festival experience. Do not misuse the app or try to access other people's data.",
  },
  {
    title: 'Contact',
    body: 'Contact details will be added before launch.',
  },
];

export default function TermsScreen() {
  const styles = useStyles();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
      <ScreenHeader title="Terms and conditions" variant="stack" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Draft, needs legal review</Text>
        </View>
        <Text style={styles.intro}>
          These terms apply to the Eventor Festival demo app. They are a draft and need legal
          review before launch.
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
