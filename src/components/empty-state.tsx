import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyMark } from '@/components/art/empty-mark';
import { Button } from '@/components/button';
import { FadeInView } from '@/components/fade-in-view';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  title: string;
  body?: string;
  /** Optional next step, shown as an outline button under the text. */
  action?: { label: string; onPress: () => void };
} & (
  /** The main empty states show the kit's medallion instead of the stock icon, so the icon is optional. */
  | { illustrated: true; icon?: IconName }
  | { illustrated?: false; icon: IconName }
);

export function EmptyState({ icon, title, body, action, illustrated = false }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <FadeInView style={styles.container}>
      {illustrated ? <View style={styles.mark}><EmptyMark seed={title} /></View> : (
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={icon} size={30} color={colors.onArt} />
        </View>
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} variant="outline" onPress={action.onPress} />
        </View>
      ) : null}
    </FadeInView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.artYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  mark: { marginBottom: spacing.xs },
  title: {
    ...typeScale.section,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typeScale.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.sm,
  },
}));
