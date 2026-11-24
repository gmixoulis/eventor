import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { View } from 'react-native';

import { wordForDay } from '@/art/words';
import { WordCard } from '@/components/art/word-card';
import { FeaturedSpeakers } from '@/components/home/featured-speakers';
import { HomeSection, useHomeStyles } from '@/components/home/section';
import { ImageSlot } from '@/components/image-slot';
import { PressableScale } from '@/components/pressable-scale';
import { ReelCarousel, ReelSectionHeader } from '@/components/reels/reel-carousel';
import { brand } from '@/constants/brand';
import { listSessions, listSpeakers } from '@/data';
import { listReels } from '@/data/reels';
import { useEventClock, useFeatures } from '@/store';

export function PitchesSection() {
  if (!listReels().length) return null;
  return <View><ReelSectionHeader title="Startup pitches" /><ReelCarousel /></View>;
}

export function SpeakersSection() {
  if (!listSpeakers().some((speaker) => speaker.featured)) return null;
  return <HomeSection title="Featured speakers"><FeaturedSpeakers /></HomeSection>;
}

export function BannersSection() {
  const url = listSessions().find((session) => session.url)?.url;
  const { flags } = useFeatures();
  const banners = [
    { label: 'Tech Stages Agenda', position: 'left' as const, source: brand.bannerAgenda, on: flags.schedule, onPress: () => router.push('/schedule') },
    { label: 'Check the Side Events', position: 'center' as const, source: brand.bannerSideEvents, on: flags.sideEvents, onPress: () => router.push('/side-events') },
    { label: 'Opening Ceremony', position: 'right' as const, source: brand.bannerOpening, on: true, onPress: () => { if (url) void openBrowserAsync(url); } },
  ].filter((banner) => banner.on);
  return <HomeSection title="Explore the festival">
    {banners.map((banner) => <PressableScale key={banner.label} accessibilityRole="link"
      accessibilityLabel={banner.label} onPress={banner.onPress}>
      <ImageSlot source={banner.source} aspectRatio={2.5} label={banner.label} radius={0}
        position={banner.position} caption={banner.label} />
    </PressableScale>)}
  </HomeSection>;
}

/** The closing poster of Home: no section header, the card carries its own title. */
export function WordSection() {
  const styles = useHomeStyles();
  const { now } = useEventClock();
  return <View style={styles.section}>
    <WordCard word={wordForDay(now)} />
  </View>;
}
