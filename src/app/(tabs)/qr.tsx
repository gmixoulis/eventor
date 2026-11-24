import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { parseLead } from '@/components/meetings/lead';
import { MyCode } from '@/components/meetings/my-code';
import { ScreenHeader } from '@/components/screen-header';
import { makeStyles } from '@/components/theme';
import { radius, spacing, typeScale } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { useLeads, useSettings, type Lead } from '@/store';

const REPEAT_MS = 3000;

export default function QrScreen() {
  const styles = useStyles();
  const [tab, setTab] = useState<'code' | 'scan'>('code');
  return (
    <View style={styles.container}>
      <ScreenHeader title="Lead Scan" variant="tab" />
      <View style={styles.tabs}>
        {(
          [
            ['code', 'My Code'],
            ['scan', 'Scan QR Code'],
          ] as const
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            {tab === key ? <View style={styles.underline} /> : null}
          </Pressable>
        ))}
      </View>
      {tab === 'code' ? <MyCode /> : <Scanner />}
    </View>
  );
}

function Scanner() {
  const styles = useStyles();
  const [permission, requestPermission] = useCameraPermissions();
  const { leads, addLead } = useLeads();
  const { use24h } = useSettings();
  const focused = useIsFocused();
  const [scanned, setScanned] = useState<Lead | null>(null);
  const [error, setError] = useState(false);
  const last = useRef({ key: '', at: 0 });

  const onScan = ({ data }: BarcodeScanningResult) => {
    const code = parseLead(data);
    const key = code?.id ?? data;
    const now = Date.now();
    if (last.current.key === key && now - last.current.at < REPEAT_MS) return;
    last.current = { key, at: now };
    if (!code) {
      setError(true);
      return;
    }
    const lead = { ...code, scannedAt: new Date().toISOString() };
    addLead(lead);
    setError(false);
    setScanned(lead);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  let camera;
  if (!permission) {
    camera = <View style={styles.camera} />;
  } else if (permission.granted) {
    camera = (
      <View style={styles.camera}>
        {/* Only one camera preview may be active, so unmount it when the tab is not focused. */}
        {focused ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScan}
          />
        ) : null}
        {error ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>Not a festival code</Text>
          </View>
        ) : null}
      </View>
    );
  } else if (permission.canAskAgain) {
    camera = (
      <View style={styles.permission}>
        <Text style={styles.body}>
          To scan another attendee&apos;s QR code and save them as a lead, the app needs access to
          your camera.
        </Text>
        <Button label="Allow camera" onPress={requestPermission} />
      </View>
    );
  } else {
    camera = (
      <View style={styles.permission}>
        <Text style={styles.body}>
          Camera access is turned off. Open Settings, choose Permissions, and allow Camera to scan QR
          codes.
        </Text>
        <Button label="Open settings" onPress={() => Linking.openSettings()} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={leads}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.leadsList}
        ListHeaderComponent={
          <>
            {camera}
            <Text style={styles.leadsTitle}>Leads</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState illustrated icon="account-multiple-outline" title="No leads yet" body="Scan a QR code to save a contact." />
        }
        renderItem={({ item }) => (
          <View style={styles.lead}>
            <Text style={styles.leadName}>{item.name}</Text>
            <Text style={styles.leadCaption}>
              {item.title} · {item.company}
            </Text>
            <Text style={styles.leadCaption}>{formatDateTime(item.scannedAt, use24h)}</Text>
          </View>
        )}
      />
      {scanned ? (
        <View style={styles.result}>
          <Text style={styles.name}>{scanned.name}</Text>
          <Text style={styles.caption}>
            {scanned.title} · {scanned.company}
          </Text>
          <Button label="Done" onPress={() => setScanned(null)} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { ...typeScale.label, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  name: { ...typeScale.title, fontSize: 17, lineHeight: 22, color: colors.text, textAlign: 'center' },
  caption: { ...typeScale.caption, color: colors.textMuted, textAlign: 'center' },
  camera: {
    height: 280,
    margin: spacing.lg,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.text,
    justifyContent: 'flex-end',
  },
  toast: {
    margin: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  toastText: { ...typeScale.label, color: colors.danger },
  permission: {
    margin: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: { ...typeScale.body, color: colors.text },
  leadsList: { paddingBottom: spacing.xxl },
  leadsTitle: {
    ...typeScale.section,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  lead: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
    alignItems: 'flex-start',
  },
  leadName: { ...typeScale.label, color: colors.text },
  leadCaption: { ...typeScale.caption, color: colors.textMuted },
  result: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
}));
