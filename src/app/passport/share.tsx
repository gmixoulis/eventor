import { Alert, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConstellationCard } from '@/components/art/constellation-card';
import { Button } from '@/components/button';
import { shareMessage } from '@/components/passport/passport-logic';
import { usePassportSky } from '@/components/passport/use-passport-sky';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { fullName } from '@/lib/format';
import { useEventName, useProfile } from '@/store';

export default function PassportShareScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useProfile();
  const eventName = useEventName();
  const cardWidth = width - spacing.lg * 2;
  const { passport, layout, collected, groups } = usePassportSky(cardWidth);
  const { points } = passport.progress;

  const share = async () => {
    try {
      await Share.share({ message: shareMessage(collected.length, points, eventName) });
    } catch {
      Alert.alert('Unable to share', 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Share" variant="stack" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View accessible accessibilityLabel={`Passport card for ${fullName(profile)}, ${points} points, ${collected.length} stamps`}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ConstellationCard
              layout={layout}
              collected={collected}
              completedGroups={groups}
              name={fullName(profile)}
              points={points}
              width={cardWidth}
            />
          </View>
        </View>
        <Button label="Share" onPress={() => void share()} />
        <Text style={styles.caption}>Take a screenshot to share the artwork.</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, alignItems: 'center' },
  caption: { ...typeScale.caption, color: colors.textMuted, textAlign: 'center' },
}));
