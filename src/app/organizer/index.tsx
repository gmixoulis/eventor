import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { isOrganizerRouteAllowed } from '@/components/auth/routes';
import { DirectoryPage } from '@/components/directory/ui';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { isPathEnabled } from '@/lib/features';
import { useFeatures, useOrganizerRole } from '@/store';

type IconName = ComponentProps<typeof FontAwesome5>['name'];

type Href =
  | '/organizer/requests'
  | '/organizer/admins'
  | '/organizer/stats'
  | '/organizer/suggest'
  | '/organizer/features'
  | '/organizer/setup';

const ROWS: { label: string; icon: IconName; href: Href }[] = [
  { label: 'Side event requests', icon: 'user-check', href: '/organizer/requests' },
  { label: 'Side event sub-admins', icon: 'user-shield', href: '/organizer/admins' },
  { label: 'Matchmaking statistics', icon: 'chart-bar', href: '/organizer/stats' },
  { label: 'Suggest a meeting', icon: 'handshake', href: '/organizer/suggest' },
  { label: 'Feature switches', icon: 'toggle-on', href: '/organizer/features' },
  { label: 'Set up your event', icon: 'magic', href: '/organizer/setup' },
];

export default function OrganizerScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { flags } = useFeatures();
  const role = useOrganizerRole();
  // The same rules as the route gates, so a row never leads to "Organizers only" or "Not available".
  const rows = ROWS.filter((row) => isOrganizerRouteAllowed(row.href, role) && isPathEnabled(row.href, flags));
  return (
    <DirectoryPage title="Organizer tools" background={colors.bg}>
      <ScrollView contentContainerStyle={styles.content}>
        {rows.map((row) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href)}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <FontAwesome5 name={row.icon} size={16} color={colors.textMuted} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>{row.label}</Text>
            <FontAwesome5 name="chevron-right" size={12} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </DirectoryPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  content: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  rowIcon: { width: 20, textAlign: 'center' },
  rowLabel: { ...typeScale.label, color: colors.text, flex: 1 },
  pressed: { opacity: 0.7 },
}));
