import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { itemHref, type AgendaItem } from '@/lib/agenda-item';

/** Every Home section: a red square from the welcome art, the title, optional "See all", the content. */
export function HomeSection({ title, href, children }: {
  title: string; href?: Href; children: ReactNode;
}) {
  const styles = useHomeStyles();
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.mark} />
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {href ? <PressableScale accessibilityRole="link" accessibilityLabel={`See all: ${title}`}
          style={styles.link} onPress={() => router.push(href)}>
          <Text style={styles.linkText}>See all</Text>
        </PressableScale> : null}
      </View>
      {children}
    </View>
  );
}

/** Plain rows on the page ground, hairlines between them and around the group. */
export function HomeList({ children }: { children: ReactNode }) {
  const styles = useHomeStyles();
  return <View style={styles.list}>{children}</View>;
}

/** One row of a HomeList. `lead` sits on the left (a time), `aside` on the right (a status pill); `first` drops the top hairline. */
export function HomeRow({ item, children, lead, aside, first }: {
  item: AgendaItem; children?: ReactNode; lead?: ReactNode; aside?: ReactNode; first: boolean;
}) {
  const styles = useHomeStyles();
  return (
    <PressableScale feedback="highlight" style={[styles.row, !first && styles.rowDivider]} accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}, ${item.place}`} onPress={() => router.push(itemHref(item))}>
      {lead}
      <View style={styles.grow}>
        <Text style={styles.label} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.caption} numberOfLines={1}>{item.place}</Text>
        {children}
      </View>
      {aside}
    </PressableScale>
  );
}

export const useHomeStyles = makeStyles(({ colors }) => StyleSheet.create({
  section: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  mark: { width: 10, height: 10, backgroundColor: colors.artRed },
  title: { ...typeScale.section, fontSize: 20, lineHeight: 26, color: colors.text, flex: 1 },
  label: { ...typeScale.label, fontSize: 15, color: colors.text },
  caption: { ...typeScale.caption, color: colors.textMuted },
  link: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  linkText: { ...typeScale.label, color: colors.primary },
  card: { minHeight: 44, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.card, gap: spacing.xs },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  grow: { flex: 1, gap: 2 },
}));
