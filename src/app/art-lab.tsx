import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cityHour, PHASE_HOURS, type SkyPhase } from '@/art/sky-light';
import { constellationLayout } from '@/art/constellation';
import { identitySpec, type IdentityInput } from '@/art/identity';
import { WORDS, wordForDay } from '@/art/words';
import { CitySky } from '@/components/art/city-sky';
import { Constellation } from '@/components/art/constellation';
import { ConstellationCard } from '@/components/art/constellation-card';
import { IdentityPair, IdentityPattern } from '@/components/art/identity-pattern';
import { MeanderDivider, MeanderLoader, MeanderProgress } from '@/components/art/meander-line';
import { WordCard } from '@/components/art/word-card';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { minutesToTime } from '@/lib/format';

// Made-up people for review only.
const PEOPLE: (IdentityInput & { label: string })[] = [
  {
    label: 'Fintech founder',
    id: 'lab-1',
    role: 'Startup',
    selections: [
      { interestId: 'group-industry-fintech', goalId: 'get-investment' },
      { interestId: 'group-startup-stage-series-a', goalId: 'network' },
    ],
  },
  {
    label: 'Deep tech investor',
    id: 'lab-2',
    role: 'Investor',
    selections: [
      { interestId: 'group-industry-fintech', goalId: 'invest' },
      { interestId: 'group-industry-robotics', goalId: 'invest' },
      { interestId: 'group-industry-space-tech', goalId: 'invest' },
      { interestId: 'group-investment-type-series-a', goalId: 'invest' },
    ],
  },
  {
    label: 'Visual artist',
    id: 'lab-3',
    role: 'Media',
    selections: [
      { interestId: 'group-industry-visual-arts', goalId: 'network' },
      { interestId: 'group-industry-music', goalId: 'network' },
    ],
  },
  {
    label: 'Studio hiring',
    id: 'lab-4',
    role: 'Corporate',
    selections: [
      { interestId: 'group-industry-gaming', goalId: 'offer-job' },
      { interestId: 'group-industry-media', goalId: 'offer-job' },
      { interestId: 'group-industry-visual-arts', goalId: 'be-mentor' },
      { interestId: 'group-industry-music', goalId: 'sell' },
      { interestId: 'group-industry-sports', goalId: 'buy' },
    ],
  },
  { label: 'First timer, one interest', id: 'lab-5', selections: [{ interestId: 'group-industry-travel', goalId: 'network' }] },
  {
    label: 'Many interests',
    id: 'lab-6',
    role: 'Startup',
    selections: [
      'health-wellbeing', 'life-sciences', 'foodtech', 'legaltech', 'robotics', 'social-impact', 'travel', 'sports', 'gaming', 'music',
    ].map((name, i) => ({ interestId: `group-industry-${name}`, goalId: i % 2 ? 'find-mentor' : 'sell' })),
  },
];

const KINDS = ['talk', 'stand', 'workshop', 'side-event'];
const TARGETS = Array.from({ length: 18 }, (_, i) => ({ id: `stop-${i + 1}`, kind: KINDS[i % KINDS.length] }));
const PHASES: SkyPhase[] = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function ArtLabScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - spacing.lg * 2;
  const specs = PEOPLE.map((p) => identitySpec(p));

  const [replay, setReplay] = useState(0);
  const [progress, setProgress] = useState(0.2);

  const layout = constellationLayout(TARGETS, 'art-lab', 320, 360);
  const [collected, setCollected] = useState<string[]>(['stop-1', 'stop-5']);
  const [completed, setCompleted] = useState<string[]>([]);
  const collectStar = () => {
    const next = TARGETS.find((t) => !collected.includes(t.id));
    if (next) setCollected([...collected, next.id]);
  };
  const completeGroup = () => {
    const kind = KINDS.find((k) => !completed.includes(k));
    if (!kind) return;
    const ids = TARGETS.filter((t) => t.kind === kind).map((t) => t.id);
    setCollected([...collected, ...ids.filter((id) => !collected.includes(id))]);
    setCompleted([...completed, kind]);
  };

  const [now] = useState(() => new Date());
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = PHASES[phaseIndex];
  // The same instant shifted so the clock in New York reads the phase's representative hour.
  const skyDate = new Date(now.getTime() + (PHASE_HOURS[phase] - cityHour(now)) * 3600000);

  const firstWord = WORDS.indexOf(wordForDay(now));
  const [wordOffset, setWordOffset] = useState(0);
  const words = [0, 1, 2].map((i) => WORDS[(firstWord + wordOffset + i) % WORDS.length]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Art lab" variant="stack" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Section title="Identity patterns">
          {PEOPLE.map((person, i) => (
            <View key={person.id} style={styles.identityRow}>
              <IdentityPattern spec={specs[i]} size={48} />
              <IdentityPattern spec={specs[i]} size={96} shape="square" />
              <View style={styles.identityText}>
                <Text style={styles.caption}>{person.label}</Text>
                <IdentityPattern spec={specs[i]} size={Math.min(160, width - 48 - 96 - spacing.md * 2)} shape="band" />
              </View>
            </View>
          ))}
          <Text style={styles.caption}>320, animated draw-in</Text>
          <View style={styles.center}>
            <IdentityPattern key={replay} spec={specs[1]} size={Math.min(320, width)} animated />
          </View>
          <Button label="Replay draw-in" variant="outline" onPress={() => setReplay((n) => n + 1)} />
          <Text style={styles.caption}>Pair: founder and investor share fintech</Text>
          <View style={styles.center}>
            <IdentityPair a={specs[0]} b={specs[1]} size={Math.min(120, (width - 60) / 2)} />
          </View>
        </Section>

        <Section title="Living meander">
          <Text style={styles.caption}>Loader</Text>
          <MeanderLoader width={width} accessibilityLabel="Loading" />
          <Text style={styles.caption}>Divider</Text>
          <MeanderDivider width={width} />
          <Text style={styles.caption}>Progress {Math.round(progress * 100)}%</Text>
          <MeanderProgress width={width} progress={progress} />
          <Button label="Advance progress" variant="outline" onPress={() => setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + 0.2)))} />
        </Section>

        <Section title="Passport constellation">
          <View style={styles.center}>
            <Constellation
              layout={layout}
              collected={collected}
              completedGroups={completed}
              size={Math.min(320, width)}
              onPressStar={(id) => !collected.includes(id) && setCollected([...collected, id])}
              starLabel={(id, isCollected) => `${id.replace('-', ' ')}, ${isCollected ? 'collected' : 'not collected'}`}
            />
          </View>
          <View style={styles.controls}>
            <Button label="Collect a star" variant="outline" onPress={collectStar} />
            <Button label="Complete a group" variant="outline" onPress={completeGroup} />
            <Button label="Reset" variant="ghost" onPress={() => { setCollected([]); setCompleted([]); }} />
          </View>
          <Text style={styles.caption}>Share card (4:5)</Text>
          <View style={styles.center}>
            <ConstellationCard layout={layout} collected={collected} completedGroups={completed} name="Ariadne Papadaki" points={collected.length * 10} width={Math.min(360, width)} />
          </View>
        </Section>

        <Section title="New York light">
          <View style={styles.skyFrame}>
            <CitySky height={120} date={skyDate} />
            <Text style={styles.skyLabel}>{phase} · {minutesToTime(PHASE_HOURS[phase] * 60)} in New York</Text>
          </View>
          <Button label="Next phase" variant="outline" onPress={() => setPhaseIndex((i) => (i + 1) % PHASES.length)} />
        </Section>

        <Section title="A word a day">
          {words.map((word) => (
            <WordCard key={word.id} word={word} width={width} />
          ))}
          <Button label="Next word" variant="outline" onPress={() => setWordOffset((n) => n + 1)} />
        </Section>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: { ...typeScale.section, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, gap: spacing.xs },
  center: { alignItems: 'center' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skyFrame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  skyLabel: { ...typeScale.label, color: colors.text, position: 'absolute', left: spacing.lg, bottom: spacing.md },
}));
