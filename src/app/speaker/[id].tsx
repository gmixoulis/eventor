import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { SessionRow } from '@/components/directory/rows';
import { DirectoryPage, useDirectoryStyles } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getSpeaker, listSessions } from '@/data';
import { useFollows } from '@/store';

export default function SpeakerScreen() {
  const ds = useDirectoryStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const speaker = getSpeaker(id);
  const { isFollowing, toggle } = useFollows();
  const following = speaker ? isFollowing(speaker.id) : false;
  const linkedin = speaker?.linkedin;
  const sessions = speaker ? listSessions({ speakerIds: [speaker.id] }) : [];

  async function openLinkedIn(url: string) {
    try {
      await openBrowserAsync(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again.');
    }
  }

  return (
    <DirectoryPage title="Speaker">
      {!speaker ? <EmptyState icon="account-outline" title="Speaker not found" /> : (
        <ScrollView>
          <View style={ds.content}>
            <Avatar name={speaker.name} uri={speaker.photo} size={96} />
            <Text style={ds.title}>{speaker.name}</Text>
            <Text style={ds.caption}>{speaker.title} • {speaker.company}</Text>
            {linkedin ? (
              <Pressable accessibilityRole="link" accessibilityLabel="LinkedIn"
                style={styles.pill} hitSlop={7} onPress={() => void openLinkedIn(linkedin)}>
                <FontAwesome5 name="linkedin" size={12} color={colors.primary} />
                <Text style={styles.link}>LinkedIn</Text>
              </Pressable>
            ) : null}
            <View style={styles.follow}>
              <Button
                label={following ? 'Following' : 'Follow'}
                accessibilityLabel={following ? `Stop following ${speaker.name}` : `Follow ${speaker.name}`}
                variant={following ? 'outline' : 'primary'}
                onPress={() => toggle(speaker.id)}
              />
            </View>
            <Text style={ds.section}>Sessions</Text>
          </View>
          {sessions.map((session) => <SessionRow key={session.id} session={session} />)}
          {!sessions.length ? <Text style={styles.none}>No sessions listed yet</Text> : null}
        </ScrollView>
      )}
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  pill: { alignSelf: 'flex-start', height: 30, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  link: { ...typeScale.label, color: colors.primary },
  follow: { alignSelf: 'stretch' },
  none: { ...typeScale.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
}));
