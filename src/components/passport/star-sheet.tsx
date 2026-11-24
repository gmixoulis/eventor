import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { collectLink, howToCollect, kindLabel } from '@/components/passport/passport-logic';
import { Sheet } from '@/components/sheet';
import { makeStyles } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import type { StampTarget } from '@/data/types';

type Props = {
  /** The last pressed target; kept while the sheet closes so its content does not blank. */
  target: StampTarget | null;
  collected: boolean;
  visible: boolean;
  onClose: () => void;
};

export function StarSheet({ target, collected, visible, onClose }: Props) {
  const styles = useStyles();
  const link = target ? collectLink(target) : null;
  const open = () => {
    if (!link) return;
    onClose();
    router.push(link.path);
  };
  return (
    <Sheet visible={visible} title={target?.title ?? 'Stamp'} onClose={onClose}>
      {target && link ? (
        <View style={styles.body}>
          <Text style={styles.meta}>
            {kindLabel(target.kind)} · {target.points} points
          </Text>
          <Text style={[styles.status, collected && styles.collected]}>
            {collected ? 'Collected' : 'Not collected yet'}
          </Text>
          <Text style={styles.how}>{howToCollect(target.kind)}</Text>
          <Button label={link.label} onPress={open} />
        </View>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  body: { gap: spacing.md },
  meta: { ...typeScale.overline, color: colors.textMuted },
  status: { ...typeScale.label, color: colors.text },
  collected: { color: colors.success },
  how: { ...typeScale.body, color: colors.textMuted },
}));
