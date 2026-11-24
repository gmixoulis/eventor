import { Pressable, StyleSheet, Text, View } from 'react-native';

import { makeStyles } from '@/components/theme';
import { MapPill, useMapPillStyles } from '@/components/venue/map-pill';
import type { useRouteWalk, WalkSpeed } from '@/components/venue/use-route-walk';
import { radius, spacing } from '@/constants/theme';

const SPEEDS: WalkSpeed[] = [1, 4, 10];

/** Demo route walk: play, pause, stop and speed. */
export function WalkControls({ walker, onStart, onStop }: {
  walker: ReturnType<typeof useRouteWalk>; onStart: () => void; onStop: () => void;
}) {
  const styles = useStyles();
  const pill = useMapPillStyles();
  const inProgress = walker.at && !walker.at.done;
  return <View style={styles.walkBar}>
    {walker.walk?.playing && !walker.at?.done
      ? <MapPill label="Pause" icon="pause" active onPress={walker.pause} />
      : <MapPill label={inProgress ? 'Resume' : 'Walk the route'} icon="walking" active
        onPress={() => { if (inProgress) walker.resume(); else onStart(); }} />}
    {walker.walk ? <MapPill label="Stop" icon="stop" active onPress={onStop} /> : null}
    {SPEEDS.map((speed) => <Pressable key={speed} accessibilityRole="button" accessibilityLabel={`Walking speed ${speed} times`}
      accessibilityState={{ selected: walker.speed === speed }} onPress={() => walker.setSpeed(speed)}
      style={[styles.speed, walker.speed === speed && pill.activePill]}>
      <Text style={[pill.label, walker.speed === speed && pill.activeText]}>{speed}x</Text>
    </Pressable>)}
  </View>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  walkBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  speed: { minWidth: 44, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
}));
