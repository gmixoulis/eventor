import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { FALLBACK_LABEL, canRetry, failureMessage, type ConversationItem } from '@/components/assistant/messages';
import { sourceHref } from '@/components/assistant/source-href';
import { parseRichText } from '@/components/assistant/rich-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { FadeInView } from '@/components/fade-in-view';
import { Pill } from '@/components/pill';
import { makeStyles } from '@/components/theme';
import { fonts, radius, spacing, typeScale } from '@/constants/theme';
import { listSessions, listSideEvents, listSpeakers, listSponsors } from '@/data';
import { useFeatures } from '@/store';

type Props = { item: ConversationItem; onRetry: (id: number, question: string) => void };

const allowedUrls = [
  ...listSessions().map((s) => s.url),
  ...listSideEvents().map((s) => s.url),
  ...listSpeakers().map((s) => s.linkedin),
  ...listSponsors().flatMap((tier) => tier.sponsors.flatMap((s) => Object.values(s.links))),
].filter((url): url is string => Boolean(url));

export function MessageBubble({ item, onRetry }: Props) {
  const styles = useStyles();
  const { flags } = useFeatures();
  if (item.role === 'user') {
    return (
      <FadeInView style={[styles.bubble, styles.mine]}>
        <Text style={styles.mineText} accessibilityLabel={`You asked: ${item.text}`}>{item.text}</Text>
      </FadeInView>
    );
  }
  if (item.role === 'answer') {
    const { answer, kind, sources } = item.response;
    return (
      <FadeInView style={[styles.bubble, styles.theirs]}>
        <View style={styles.gap} accessibilityLiveRegion="polite">
          {kind === 'fallback' ? <Pill tone="warning" label={FALLBACK_LABEL} /> : null}
          {parseRichText(answer, allowedUrls).map((block, index) => (
            <View key={index} style={styles.line}>
              {block.kind === 'bullet' ? <Text style={styles.text} accessible={false}>•</Text> : null}
              <Text selectable style={[styles.text, styles.content]}>
                {block.spans.map(({ text, bold, href }, i) => (
                  <Text key={i} style={[bold && styles.bold, href && styles.link]}
                    accessibilityRole={href ? 'link' : undefined}
                    onPress={href ? () => void WebBrowser.openBrowserAsync(href).catch(() =>
                      Alert.alert('Unable to open link', 'Please try again.')) : undefined}>
                    {text}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>
        {sources.length > 0 ? (
          <View style={styles.sources}>
            {sources.map((s) => {
              const href = sourceHref(s, flags);
              return <Chip key={`${s.type}:${s.id}`} label={s.title} accessibilityLabel={href ? `Open ${s.title}` : undefined}
                disabled={!href} onPress={href ? () => router.push(href) : undefined} />;
            })}
          </View>
        ) : null}
      </FadeInView>
    );
  }
  return (
    <FadeInView style={[styles.bubble, styles.theirs]}>
      <View style={styles.gap} accessibilityLiveRegion="polite">
        <Text style={styles.text}>{failureMessage(item.reason, item.retryAfterSec)}</Text>
        {canRetry(item.reason) ? (
          <Button variant="outline" label="Retry" accessibilityLabel="Retry the question"
            onPress={() => onRetry(item.id, item.question)} />
        ) : null}
      </View>
    </FadeInView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  bubble: { maxWidth: '88%', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.text },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  gap: { gap: spacing.sm, alignItems: 'flex-start' },
  text: { ...typeScale.body, color: colors.text },
  line: { flexDirection: 'row', gap: spacing.sm },
  content: { flexShrink: 1 },
  bold: { fontFamily: fonts.sansSemibold },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  mineText: { ...typeScale.body, color: colors.bg },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.xs },
}));
