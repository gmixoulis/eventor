import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PopIn } from '@/components/pop-in';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getStampTarget } from '@/data';
import { usePassport } from '@/store';

/**
 * One tap collects a stamp at a sponsor booth or a live side event. Once collected it becomes a
 * quiet success line with the target's points, which pops in once right after the check-in.
 */
export function StampCheckIn({ targetId }: { targetId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { has, collect } = usePassport();
  const [pending, setPending] = useState(false);
  const [justCollected, setJustCollected] = useState(false);
  const points = getStampTarget(targetId)?.points ?? 0;

  const checkIn = async () => {
    setPending(true);
    const ok = await collect(targetId);
    setPending(false);
    if (!ok) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJustCollected(true);
  };

  if (has(targetId)) {
    return (
      <PopIn celebrate={justCollected}>
        <View
          style={styles.done}
          accessibilityLiveRegion="polite"
          accessible
          accessibilityLabel={`Checked in, stamp collected, plus ${points} points`}
        >
          <FontAwesome5 name="check-circle" solid size={16} color={colors.success} />
          <Text style={styles.doneText}>Checked in · stamp collected, +{points} points</Text>
        </View>
      </PopIn>
    );
  }
  return <Button label="Check in for a stamp" disabled={pending} onPress={() => void checkIn()} />;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  doneText: { ...typeScale.label, color: colors.success, flexShrink: 1 },
}));
