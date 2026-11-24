import { FontAwesome5 } from '@expo/vector-icons';
import { Children, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';

type IconName = ComponentProps<typeof FontAwesome5>['name'];

type RowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  accessibilityLabel?: string;
  /** A small mark before the chevron, for example a Pill. */
  aside?: ReactNode;
};

export function Row({ icon, title, subtitle, onPress, danger, accessibilityLabel, aside }: RowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      feedback="highlight"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      style={styles.row}>
      <View style={styles.iconWrap}>
        <FontAwesome5 name={icon} solid size={15} color={danger ? colors.danger : colors.textMuted} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, danger && styles.dangerTitle]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {aside}
      <FontAwesome5 name="chevron-right" size={12} color={colors.textMuted} />
    </PressableScale>
  );
}

type RowGroupProps = {
  title?: string;
  caption?: string;
  children: ReactNode;
};

export function RowGroup({ title, caption, children }: RowGroupProps) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      {title || caption ? (
        <View style={styles.groupHeader}>
          {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
          {caption ? <Text style={styles.groupCaption}>{caption}</Text> : null}
        </View>
      ) : null}
      <View style={styles.list}>
        {Children.toArray(children).map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 20,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typeScale.label,
    color: colors.text,
  },
  dangerTitle: {
    color: colors.danger,
  },
  subtitle: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  group: {
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  groupHeader: {
    paddingHorizontal: spacing.lg,
  },
  groupTitle: {
    ...typeScale.section,
    color: colors.text,
  },
  groupCaption: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 20 + spacing.md,
    backgroundColor: colors.border,
  },
}));
