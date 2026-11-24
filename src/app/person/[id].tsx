import { FontAwesome5 } from '@expo/vector-icons';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IdentityHeader } from '@/components/art/identity-header';
import { personIdentity, useMyIdentity } from '@/components/art/use-identity';
import { Button } from '@/components/button';
import { DirectoryPage, useDirectoryStyles } from '@/components/directory/ui';
import { EmptyState } from '@/components/empty-state';
import { goalTag } from '@/components/matching/goals';
import { MatchReasons, MatchTier, SharedMarks } from '@/components/matching/match-reasons';
import { useMatches } from '@/components/matching/use-matches';
import { SlotPicker } from '@/components/meetings/slot-picker';
import { PressableScale } from '@/components/pressable-scale';
import { useAppActive } from '@/components/reels/use-reel-reactions';
import { Sheet } from '@/components/sheet';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { getInterest, getPerson } from '@/data';
import { useFeatures, useMatchFeedback, useMeetings, useOccupiedMeetings, useProfile } from '@/store';

export default function PersonScreen() {
  const ds = useDirectoryStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = getPerson(id);
  const { meetings, request } = useMeetings();
  const occupied = useOccupiedMeetings();
  const { profile } = useProfile();
  const { flags } = useFeatures();
  const { byPerson } = useMatches();
  const { bookmark, unbookmark, bookmarked, hide, record } = useMatchFeedback();
  const [requesting, setRequesting] = useState(false);
  const focused = useIsFocused();
  const active = useAppActive();
  const viewed = useRef(false);
  const saved = bookmarked.includes(id);
  const match = byPerson[id];
  const mine = useMyIdentity();
  const theirs = personIdentity(id);
  const recordView = useEffectEvent(() => {
    void record(id, 'profile_viewed').catch(() => {});
  });

  useEffect(() => { viewed.current = false; }, [focused, id]);
  useEffect(() => {
    if (!focused || !active || !person || !profile.networking || viewed.current) return;
    const timer = setTimeout(() => { viewed.current = true; recordView(); }, 4000);
    return () => clearTimeout(timer);
  }, [focused, active, id, person, profile.networking]);

  function requestMeeting() {
    if (!person || !profile.networking) return;
    setRequesting(true);
  }

  return (
    <DirectoryPage title="" background={colors.bg}>
      {!person ? <EmptyState icon="account-outline" title="Person not found" /> : (
        <ScrollView>
          <View style={ds.content}>
            <IdentityHeader spec={theirs ?? mine} name={person.name} role={person.role} title={person.title}
              company={person.company} animated tag={<MatchTier match={match} />}
              accessory={<PressableScale style={styles.bookmark} accessibilityRole="button"
                accessibilityLabel={`${saved ? 'Remove bookmark' : 'Bookmark'} ${person.name}`}
                accessibilityState={{ selected: saved }} onPress={() => saved ? unbookmark(id) : bookmark(id)}>
                <FontAwesome5 name="bookmark" solid={saved} size={20} color={colors.primary} />
              </PressableScale>} />
            <Text style={ds.text}>{person.intro}</Text>
            {match ? <MatchReasons match={match} art={theirs ? <SharedMarks mine={mine} theirs={theirs} /> : undefined} /> : null}
            <View style={styles.block}>
              <Text style={ds.caption}>Operates in</Text>
              <Text style={ds.text}>{person.countries.join(', ')}</Text>
            </View>
            <View style={styles.block}>
              <Text style={ds.caption}>Industry</Text>
              <Text style={ds.text}>{person.industry}</Text>
            </View>
            <View style={styles.block}>
              <Text style={styles.section} accessibilityRole="header">Interests</Text>
              <View style={styles.chips}>
                {person.selections.map((selection) => {
                  const name = getInterest(selection.interestId)?.name ?? selection.interestId;
                  const goal = goalTag(selection.goalId);
                  // The goal sits on its own smaller line so long interest names never clip inside a fixed-height chip.
                  return (
                    <View key={`${selection.interestId}:${selection.goalId}`} style={styles.interest} accessible
                      accessibilityRole="text" accessibilityLabel={goal ? `${name}, ${goal}` : name}>
                      <Text style={styles.interestName}>{name}</Text>
                      {goal ? <Text style={styles.interestGoal}>{goal}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </View>
            {!flags.meetings ? null : profile.networking ? <Button label="Request meeting" accessibilityLabel="Request meeting" onPress={requestMeeting} />
              : <Text style={ds.caption}>Turn on networking in Account to request meetings.</Text>}
            {flags.meetings ? <Button label="Chat" accessibilityLabel={`Chat with ${person.name}`} variant="outline" onPress={() => router.push(`/chat/${person.id}`)} /> : null}
            <Button label="Not relevant" accessibilityLabel={`Hide ${person.name}`} variant="ghost" onPress={() => { hide(id); router.back(); }} />
            <Text style={styles.notRelevantNote}>You can bring people back in Account, Hidden people.</Text>
          </View>
        </ScrollView>
      )}
      <Sheet visible={requesting} title="Pick a time" onClose={() => setRequesting(false)}>
        {requesting && person ? (
          <SlotPicker
            me={{ availability: profile.availability, meetings }}
            them={{ availability: [], meetings: [] }}
            submitLabel="Send request"
            confirmation="Request sent"
            occupied={occupied}
            onSubmit={(slot, note) => request(person.id, slot, note)}
          />
        ) : null}
      </Sheet>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  block: { gap: spacing.xs, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bookmark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { ...typeScale.section, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interest: {
    maxWidth: '100%',
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  interestName: { ...typeScale.label, fontSize: 13, lineHeight: 18, color: colors.text },
  interestGoal: { ...typeScale.caption, fontSize: 11, lineHeight: 14, color: colors.textMuted },
  notRelevantNote: { ...typeScale.caption, color: colors.textMuted, textAlign: 'center' },
}));
