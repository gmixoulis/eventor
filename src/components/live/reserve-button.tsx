import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { reserveState } from '@/components/live/reserve-state';
import { PopIn } from '@/components/pop-in';
import { useLiveStatus } from '@/components/live/use-live-status';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { AgendaItem } from '@/lib/agenda-item';
import { useEventClock, useReservations, useSession } from '@/store';

/**
 * Reserve a seat, join the waitlist, or show and release what the user holds.
 * Reserve and waitlist are the primary action unless `secondary` (another action leads).
 */
export function ReserveButton({ item, secondary }: { item: AgendaItem; secondary: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const statusFor = useLiveStatus();
  const { now } = useEventClock();
  const { statusOf, positionOf, reserve, cancel } = useReservations();
  const { isGuest } = useSession();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // True only right after this screen's own reserve succeeded, so the held line pops in once.
  const [justHeld, setJustHeld] = useState(false);

  const state = reserveState(statusFor(item), statusOf(item.key), positionOf(item.key));
  if (state.kind === 'hidden') return null;

  const onReserve = async () => {
    setPending(true);
    setFailed(false);
    const result = await reserve(item, now);
    setPending(false);
    if (result === 'switched') return;
    if (result) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustHeld(true);
    } else if (!isGuest) setFailed(true);
  };

  const onRelease = () => {
    const waitlist = state.kind === 'waitlist';
    Alert.alert(waitlist ? 'Leave the waitlist?' : 'Cancel your seat?', item.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: waitlist ? 'Leave' : 'Cancel seat',
        style: 'destructive',
        onPress: async () => {
          setPending(true);
          await cancel(item.key, now);
          setPending(false);
        },
      },
    ]);
  };

  if (state.kind === 'reserved' || state.kind === 'waitlist') {
    const text =
      state.kind === 'reserved'
        ? 'Reserved'
        : state.position === null
          ? 'On the waitlist'
          : `On the waitlist, position ${state.position}`;
    return (
      <PopIn celebrate={justHeld}>
        <View style={styles.held}>
          <FontAwesome5
            name={state.kind === 'reserved' ? 'check-circle' : 'hourglass-half'}
            solid
            size={14}
            color={state.kind === 'reserved' ? colors.success : colors.warning}
          />
          <Text style={styles.heldText}>{text}</Text>
          <Button
            label={state.kind === 'reserved' ? 'Cancel' : 'Leave'}
            accessibilityLabel={state.kind === 'reserved' ? 'Cancel your seat' : 'Leave the waitlist'}
            variant="ghost"
            disabled={pending}
            onPress={onRelease}
          />
        </View>
      </PopIn>
    );
  }

  const join = state.kind === 'join-waitlist';
  return (
    <View style={styles.wrap}>
      <Button
        label={pending ? 'One moment' : join ? 'Join the waitlist' : 'Reserve a seat'}
        variant={secondary ? 'outline' : 'primary'}
        disabled={pending}
        onPress={() => void onReserve()}
      />
      {failed ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          That did not go through. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs },
    held: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
    heldText: { ...typeScale.label, color: colors.text, flex: 1 },
    error: { ...typeScale.caption, color: colors.danger },
  }),
);
