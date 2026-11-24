import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ImageSlot } from '@/components/image-slot';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles, useTheme } from '@/components/theme';
import { Tile } from '@/components/tile';
import { brand } from '@/constants/brand';
import { spacing, typeScale } from '@/constants/theme';
import { useEventName, useFeatures, useOrganizerRole, useSession } from '@/store';

export default function MenuScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { isGuest } = useSession();
  const { flags } = useFeatures();
  const role = useOrganizerRole();
  const eventName = useEventName();
  return (
    <View style={styles.container}>
      <ScreenHeader title="Menu" variant="tab" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ImageSlot source={brand.menuHeader} aspectRatio={2.6} label="Brand header" radius={0} position="left" />

        <View style={styles.content}>
          <Text style={styles.eventName}>{eventName}</Text>

          {role.isAdmin ? (
            <Pressable onPress={() => router.push('/organizer/setup')} hitSlop={8} accessibilityRole="button" style={styles.changeEvent}>
              <Text style={styles.changeEventText}>Change Event</Text>
              <FontAwesome5 name="arrow-right" size={10} color={colors.primary} />
            </Pressable>
          ) : null}

          <View style={styles.grid}>
            {flags.people ? (
              <View style={styles.tileWrap}>
                {isGuest ? (
                  <View style={styles.lockedTile}>
                    <Tile
                      icon="users"
                      label="People"
                      onPress={() => router.push({ pathname: '/sign-in', params: { next: '/people' } })}
                    />
                    <FontAwesome5 name="lock" size={10} color={colors.textMuted} style={styles.lockIcon} />
                  </View>
                ) : (
                  <Tile icon="users" label="People" onPress={() => router.push('/people')} />
                )}
              </View>
            ) : null}
            {flags.schedule ? (
              <View style={styles.tileWrap}>
                <Tile icon="calendar-alt" label="Schedule" onPress={() => router.push('/schedule')} />
              </View>
            ) : null}
            {flags.speakers ? (
              <View style={styles.tileWrap}>
                <Tile icon="user-tie" label="Speakers" onPress={() => router.push('/speakers')} />
              </View>
            ) : null}
            {flags.sponsors ? (
              <View style={styles.tileWrap}>
                <Tile icon="handshake" label="Sponsors" onPress={() => router.push('/sponsors')} />
              </View>
            ) : null}
            {flags.guide ? (
              <View style={styles.tileWrap}>
                <Tile icon="book" label="Guide" onPress={() => router.push('/guide')} />
              </View>
            ) : null}
            {flags.map ? (
              <>
                <View style={styles.tileWrap}>
                  <Tile icon="map-signs" label="Map" onPress={() => router.push('/map')} />
                </View>
                <View style={styles.tileWrap}>
                  <Tile icon="globe-europe" label="Map 2" onPress={() => router.push('/map2')} />
                </View>
              </>
            ) : null}
            {flags.sideEvents ? (
              <View style={styles.tileWrap}>
                <Tile icon="glass-cheers" label="Side events" onPress={() => router.push('/side-events')} />
              </View>
            ) : null}
            {flags.tickets ? (
              <View style={styles.tileWrap}>
                {isGuest ? (
                  <View style={styles.lockedTile}>
                    <Tile
                      icon="ticket-alt"
                      label="Tickets"
                      onPress={() => router.push({ pathname: '/sign-in', params: { next: '/tickets' } })}
                    />
                    <FontAwesome5 name="lock" size={10} color={colors.textMuted} style={styles.lockIcon} />
                  </View>
                ) : (
                  <Tile icon="ticket-alt" label="Tickets" onPress={() => router.push('/tickets')} />
                )}
              </View>
            ) : null}
            {!isGuest && flags.ask ? (
              <View style={styles.tileWrap}>
                <Tile icon="comments" label="Ask" onPress={() => router.push('/ask')} />
              </View>
            ) : null}
            {!isGuest && flags.passport ? (
              <View style={styles.tileWrap}>
                <Tile icon="passport" label="Passport" onPress={() => router.push('/passport')} />
              </View>
            ) : null}
            <View style={styles.tileWrap}>
              {isGuest ? (
                <Tile icon="sign-in-alt" label="Sign in" onPress={() => router.push('/sign-in')} />
              ) : (
                <Tile icon="cog" label="Settings" onPress={() => router.push('/account')} />
              )}
            </View>
            {role.isAdmin || role.isSubAdmin ? (
              <View style={styles.tileWrap}>
                <Tile icon="tools" label="Organizer tools" onPress={() => router.push('/organizer')} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  eventName: {
    ...typeScale.title,
    color: colors.text,
  },
  changeEvent: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  changeEventText: {
    ...typeScale.label,
    color: colors.primary,
  },
  grid: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tileWrap: {
    width: '47%',
  },
  lockedTile: {},
  lockIcon: {
    position: 'absolute',
    top: '50%',
    marginTop: -5, // half the 10px icon, so it centres on the tile whatever its height
    right: spacing.xs,
  },
}));
