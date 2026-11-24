import { FontAwesome5 } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { MeanderLoader } from '@/components/art/meander-line';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';
import { GUIDE_URL } from '@/components/venue/config';
import { makeStyles, useTheme } from '@/components/theme';
import { radius, spacing } from '@/constants/theme';

export default function GuideScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const webview = useRef<WebView<object>>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState({ canGoBack: false, canGoForward: false });
  const insets = useSafeAreaInsets();

  function reload() {
    setFailed(false);
    setLoading(true);
    webview.current?.reload();
  }

  function fail() {
    setLoading(false);
    setFailed(true);
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.page}>
      <ScreenHeader title="Guide" variant="stack" />
      <View style={[styles.body, { paddingBottom: insets.bottom }]}>
        {GUIDE_URL ? <>
          <WebView<object> ref={webview} source={{ uri: GUIDE_URL }} style={styles.webview}
            onLoadStart={() => { setLoading(true); setFailed(false); }} onLoadEnd={() => setLoading(false)}
            onError={fail} onHttpError={fail}
            onNavigationStateChange={({ canGoBack, canGoForward }) => setHistory({ canGoBack, canGoForward })} />
          {loading && !failed ? <View style={styles.state}>
            <MeanderLoader width={160} accessibilityLabel="Loading guide" />
          </View> : null}
          {failed ? <View style={styles.state}>
            <EmptyState icon="alert-circle-outline" title="Unable to load guide" body="Please check your connection and try again." />
            <Button label="Try again" variant="outline" onPress={reload} />
          </View> : null}
          {/* Web navigation only makes sense when there is a page to navigate. */}
          <View style={[styles.pill, { bottom: spacing.lg + insets.bottom }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back"
              accessibilityState={{ disabled: !history.canGoBack }}
              disabled={!history.canGoBack} onPress={() => webview.current?.goBack()}
              style={[styles.control, !history.canGoBack && styles.disabled]}>
              <FontAwesome5 name="arrow-left" size={14} color={colors.bg} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Reload guide"
              onPress={reload} style={styles.control}>
              <FontAwesome5 name="sync" size={14} color={colors.bg} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Go forward"
              accessibilityState={{ disabled: !history.canGoForward }}
              disabled={!history.canGoForward} onPress={() => webview.current?.goForward()}
              style={[styles.control, !history.canGoForward && styles.disabled]}>
              <FontAwesome5 name="arrow-right" size={14} color={colors.bg} />
            </Pressable>
          </View>
        </> : <View style={styles.center}>
          <EmptyState illustrated icon="book-open-outline" title="Guide coming soon" body="The festival guide has not been published yet." />
        </View>}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.card },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.card },
  center: { flex: 1, justifyContent: 'center' },
  state: { ...StyleSheet.absoluteFill, paddingBottom: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
  pill: { position: 'absolute', left: spacing.lg, flexDirection: 'row', height: 40,
    borderRadius: radius.pill, backgroundColor: colors.text, paddingHorizontal: spacing.xs },
  control: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
}));
