import type { ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { IdentitySpec } from '@/art/identity';
import { IdentityPattern } from '@/components/art/identity-pattern';
import { Avatar } from '@/components/avatar';
import { makeStyles } from '@/components/theme';
import { fonts, spacing, typeScale } from '@/constants/theme';

const AVATAR = 72;

type Props = {
  spec: IdentitySpec;
  name: string;
  role: string;
  title: string;
  company: string;
  /** Draw the band in once on open (profile screens); off where the screen is visited often. */
  animated?: boolean;
  /** Beside the name, for example the match pill. */
  tag?: ReactNode;
  /** Top right of the identity block, for example the bookmark button. */
  accessory?: ReactNode;
  /** Small mark over the avatar's top edge, for example the camera hint on Account. */
  avatarBadge?: ReactNode;
};

/**
 * The person's identity band across the top, the avatar overlapping its lower edge, then the
 * name block on the plain page. Nothing is drawn behind the text.
 */
export function IdentityHeader({ spec, name, role, title, company, animated = false, tag, accessory, avatarBadge }: Props) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const bandWidth = width - spacing.lg * 2;
  return (
    <View style={styles.wrap}>
      <IdentityPattern spec={spec} size={bandWidth} shape="band" animated={animated} />
      <View style={styles.avatarRow}>
        <View style={styles.avatarRing}>
          <Avatar name={name} size={AVATAR} shape="square" radius={10} />
          {avatarBadge}
        </View>
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      <View style={styles.id}>
        <Text style={styles.role}>{role}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name} accessibilityRole="header">{name}</Text>
          {tag}
        </View>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {company ? <Text style={styles.company}>{company}</Text> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  wrap: { gap: spacing.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -AVATAR / 2 - spacing.sm, paddingLeft: spacing.lg },
  avatarRing: { padding: 3, borderRadius: 13, backgroundColor: colors.bg },
  accessory: { marginBottom: -spacing.xs },
  id: { gap: 2, paddingTop: spacing.xs },
  role: { ...typeScale.caption, fontFamily: fonts.sansSemibold, color: colors.textMuted },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { ...typeScale.title, color: colors.text },
  title: { ...typeScale.body, color: colors.text },
  company: { ...typeScale.caption, color: colors.textMuted },
}));
