import { FontAwesome5 } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { DirectoryPage } from '@/components/directory/ui';
import { PressableScale } from '@/components/pressable-scale';
import { RowGroup } from '@/components/row';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { DEMO_CLOCK_PRESETS, REAL_TIME_LABEL } from '@/lib/event-clock';
import { eventTimeLabel, formatShortDay, formatTime } from '@/lib/format';
import { useEventClock, useSession, useSettings } from '@/store';

/**
 * Outside /account so a guest can open it from the Home "Demo time" pill. Changing the time writes
 * settings, which is signed-in only, so a guest sees the current time and a way to sign in.
 */
export default function EventTimeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const pathname = usePathname();
  const { now, isDemo, presetId, setPreset } = useEventClock();
  const { use24h } = useSettings();
  const { isGuest } = useSession();
  const options = [
    ...DEMO_CLOCK_PRESETS.map((preset) => ({
      id: preset.id,
      label: `${formatShortDay(preset.anchor.slice(0, 10))}, ${formatTime(preset.anchor.slice(11, 16), use24h)}`,
    })),
    { id: null, label: REAL_TIME_LABEL },
  ];
  const nowLabel = eventTimeLabel(now, use24h);

  return <DirectoryPage title="Event time" background={colors.bg}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <View style={styles.now} accessible accessibilityLabel={`Current event time, ${nowLabel}`}>
          <Text style={styles.caption}>Current event time</Text>
          <Text style={styles.time} selectable>{nowLabel}</Text>
        </View>
        <Text style={styles.body}>The festival dates have passed. Choose a moment to see the app as it would look then.</Text>
        {isGuest ? <View style={styles.guest}>
          <Text style={styles.label}>Sign in to change the event time</Text>
          <Button label="Sign in" accessibilityLabel="Sign in" onPress={() => router.push({ pathname: '/sign-in', params: { next: pathname } })} />
        </View> : null}
      </View>
      {isGuest ? null : <View accessibilityRole="radiogroup" accessibilityLabel="Event time">
        <RowGroup>
          {options.map((option) => {
            const selected = option.id === null ? !isDemo : presetId === option.id;
            return <PressableScale key={option.id ?? 'real-time'} feedback="highlight" style={styles.option}
              accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected }}
              onPress={() => setPreset(option.id)}>
              <Text style={styles.label}>{option.label}</Text>
              {selected ? <FontAwesome5 name="check" size={14} color={colors.primary} /> : null}
            </PressableScale>;
          })}
        </RowGroup>
      </View>}
    </ScrollView>
  </DirectoryPage>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  now: { gap: spacing.xs },
  time: { ...typeScale.title, color: colors.text, fontVariant: ['tabular-nums'] },
  body: { ...typeScale.body, color: colors.textMuted },
  label: { ...typeScale.label, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  guest: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.card },
  // The appearance screen's choice row: label left, a check on the chosen one.
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg },
}));
