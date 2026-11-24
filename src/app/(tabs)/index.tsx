import { ScrollView, StyleSheet, View } from 'react-native';

import { CitySky } from '@/components/art/city-sky';
import { FadeInView } from '@/components/fade-in-view';
import { visibleSections } from '@/components/home/helpers';
import { MatchesSection } from '@/components/home/matches-section';
import { NearNowSection } from '@/components/home/near-now-section';
import { PassportSection } from '@/components/home/passport-section';
import { RecommendedSection } from '@/components/home/recommended-section';
import { SideEventsSection } from '@/components/home/side-events-section';
import { TicketSection } from '@/components/home/ticket-section';
import { TodayHeader } from '@/components/home/today-header';
import { BannersSection, PitchesSection, SpeakersSection, WordSection } from '@/components/home/static-sections';
import { UpNextSection } from '@/components/home/up-next-section';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing } from '@/constants/theme';
import type { HomeSection } from '@/lib/home-layout';
import { useEventClock, useFeatures, useProfile, useSession } from '@/store';

const sections = {
  ticket: TicketSection,
  'up-next': UpNextSection, 'near-now': NearNowSection, matches: MatchesSection,
  recommended: RecommendedSection, pitches: PitchesSection, 'side-events': SideEventsSection,
  passport: PassportSection, speakers: SpeakersSection, banners: BannersSection, word: WordSection,
} satisfies Record<HomeSection, () => React.JSX.Element | null>;

export default function EventHomeScreen() {
  const styles = useStyles();
  const { now } = useEventClock();
  const { profile } = useProfile();
  const { isGuest, account } = useSession();
  const { flags } = useFeatures();
  const order = visibleSections(profile.role, isGuest, profile.networking, flags);
  return <View style={styles.page}>
    <ScreenHeader title="Event Home" variant="tab" />
    <ScrollView contentContainerStyle={styles.content}>
      <CitySky height={200} date={now} style={styles.sky} />
      <FadeInView index={0}><TodayHeader /></FadeInView>
      {order.map((section, index) => {
        const Section = sections[section];
        const content = <Section />;
        const key = `${account?.id ?? 'guest'}:${section}`;
        // Only the first section rises in with the day header; the rest are below the fold.
        return index === 0 ? <FadeInView key={key} index={1}>{content}</FadeInView> : <View key={key}>{content}</View>;
      })}
    </ScrollView>
  </View>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  sky: { position: 'absolute', left: 0, right: 0, top: 0 },
}));
