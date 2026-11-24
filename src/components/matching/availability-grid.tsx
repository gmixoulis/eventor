import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getEvent } from '@/data';
import { formatFullDay, formatTime, pad2 } from '@/lib/format';
import { useProfile, useSettings } from '@/store';

const START_HOUR = 9;
const END_HOUR = 17;

function slotValue(day: string, hour: number): string {
  return `${day}T${pad2(hour)}:00`;
}

/** Day headings with hour chips bound to profile.availability. Render inside a ScrollView. */
export function AvailabilityGrid() {
  const styles = useStyles();
  const { profile, updateProfile } = useProfile();
  const { use24h } = useSettings();
  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h += 1) hours.push(h);

  const toggle = (value: string) => {
    const availability = profile.availability.includes(value)
      ? profile.availability.filter((v) => v !== value)
      : [...profile.availability, value];
    updateProfile({ availability });
  };

  return (
    <View style={styles.container}>
      {getEvent().days.map((day) => (
        <View key={day} style={styles.day}>
          <Text style={styles.dayTitle}>{formatFullDay(day)}</Text>
          <View style={styles.chips}>
            {hours.map((hour) => {
              const value = slotValue(day, hour);
              return (
                <Chip
                  key={value}
                  label={formatTime(`${pad2(hour)}:00`, use24h)}
                  selected={profile.availability.includes(value)}
                  onPress={() => toggle(value)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { gap: spacing.lg },
  day: { gap: spacing.sm },
  dayTitle: { ...typeScale.section, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
