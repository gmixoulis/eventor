import { FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { makeStyles, useTheme } from '@/components/theme';
import { parseCheckpoint } from '@/components/venue/checkpoint';
import { windowInsets } from '@/components/window-insets';
import { radius, spacing, typeScale } from '@/constants/theme';

/** Full-screen scanner for printed place checkpoints; calls onFound once with a valid place id. */
export function CheckpointScanner({ placeIds, onFound, onClose }: { placeIds: string[]; onFound: (placeId: string) => void; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState(false);
  const done = useRef(false);

  function onScan({ data }: BarcodeScanningResult) {
    if (done.current) return;
    const placeId = parseCheckpoint(data, placeIds);
    if (!placeId) { setError(true); return; }
    done.current = true;
    onFound(placeId);
  }

  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[styles.page, { paddingTop: windowInsets.top, paddingBottom: windowInsets.bottom }]}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Scan a checkpoint</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={onClose} style={styles.close}>
          <FontAwesome5 name="times" size={18} color={colors.card} />
        </Pressable>
      </View>
      {!permission ? <View style={styles.flex} /> : permission.granted ? <View style={styles.scanArea}>
        <View style={styles.viewfinder}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.hint, error && styles.error]}>
          {error ? 'Not a checkpoint code' : 'Point the camera at a checkpoint code printed at a festival place'}</Text>
      </View> : <View style={styles.permission}>
        <Text style={styles.body}>{permission.canAskAgain
          ? 'To scan a checkpoint and set your position, the app needs access to your camera.'
          : 'Camera access is turned off. Open Settings, choose Permissions, and allow Camera to scan checkpoints.'}</Text>
        {permission.canAskAgain ? <Button label="Allow camera" onPress={requestPermission} />
          : <Button label="Open settings" onPress={() => Linking.openSettings()} />}
      </View>}
    </View>
  </Modal>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.text },
  flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, minHeight: 56 },
  title: { ...typeScale.section, color: colors.card, flex: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  // A centred square viewfinder, not a full-bleed camera pinned under the heading and the notch.
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, padding: spacing.xl },
  viewfinder: { width: '100%', maxWidth: 360, aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: colors.card },
  hint: { ...typeScale.label, alignSelf: 'stretch', padding: spacing.md,
    borderRadius: radius.md, overflow: 'hidden', textAlign: 'center', color: colors.text, backgroundColor: colors.card },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft },
  permission: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.card },
  body: { ...typeScale.body, color: colors.text },
}));
