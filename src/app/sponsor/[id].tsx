import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { SponsorBand } from '@/components/directory/sponsor-band';
import { DirectoryPage, useDirectoryStyles } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { StampCheckIn } from '@/components/passport/stamp-check-in';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getPerson, getSponsor, stampTargetId } from '@/data';
import { useFeatures, useSession } from '@/store';

export default function SponsorScreen() {
  const ds = useDirectoryStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isGuest } = useSession();
  const { flags } = useFeatures();
  const sponsor = getSponsor(id);
  const [expanded, setExpanded] = useState(false);
  const [longDescription, setLongDescription] = useState(false);
  const links = sponsor ? [
    { label: 'Website', icon: 'globe', url: sponsor.links.website },
    { label: 'LinkedIn', icon: 'linkedin', url: sponsor.links.linkedin },
    { label: 'Instagram', icon: 'instagram', url: sponsor.links.instagram },
  ] as const : [];

  async function openLink(url: string) {
    try {
      await openBrowserAsync(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again.');
    }
  }

  return (
    <DirectoryPage title={sponsor?.name ?? 'Sponsor'} background={colors.bg}>
      {!sponsor ? <EmptyState icon="storefront-outline" title="Sponsor not found" /> : (
        <ScrollView>
          <SponsorBand sponsor={sponsor} compact />
          <View style={ds.content}>
            <View style={styles.links}>
              {links.map((link) => link.url ? (
                <Pressable key={link.label} accessibilityRole="link" accessibilityLabel={link.label}
                  style={styles.pill} onPress={() => void openLink(link.url!)}>
                  <FontAwesome5 name={link.icon} size={12} color={colors.primary} />
                  <Text style={styles.linkText}>{link.label}</Text>
                </Pressable>
              ) : null)}
            </View>
            {isGuest || !flags.passport ? null : <View style={styles.checkIn}>
              <Text style={ds.section}>At the booth?</Text>
              <StampCheckIn targetId={stampTargetId('sponsor', sponsor.id)} />
            </View>}
            <Text style={ds.section}>Details</Text>
            <View style={styles.description}>
              <Text style={[ds.text, styles.measure]} accessible={false} accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                onTextLayout={(event) => setLongDescription(event.nativeEvent.lines.length > 8)}>{sponsor.description}</Text>
              <Text style={ds.text} numberOfLines={expanded ? undefined : 8}>{sponsor.description}</Text>
              {longDescription ? <Button variant="outline" label={expanded ? 'Show less' : 'Show more'} onPress={() => setExpanded(!expanded)} /> : null}
            </View>
            <Text style={ds.section}>Team</Text>
            {sponsor.team.map((personId) => {
              const person = getPerson(personId);
              return person ? (
                <Pressable key={person.id} style={[ds.row, styles.member]} accessibilityRole={flags.people ? 'button' : undefined}
                  onPress={flags.people ? () => router.push(`/person/${person.id}`) : undefined}>
                  <Avatar name={person.name} size={36} />
                  <View style={ds.grow}>
                    <Text style={ds.label}>{person.name}</Text>
                    <Text style={ds.caption}>{person.title}</Text>
                  </View>
                </Pressable>
              ) : null;
            })}
            {!sponsor.team.length ? <Text style={ds.caption}>No team members listed</Text> : null}
          </View>
        </ScrollView>
      )}
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  linkText: { ...typeScale.label, color: colors.primary },
  checkIn: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  description: { gap: spacing.md },
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  member: { minHeight: 52 },
}));
