import { View } from 'react-native';

import { Pill, type PillTone } from '@/components/pill';
import type { LiveStatus } from '@/lib/live-status';

/** An ended item reads as ended whatever its seats; otherwise seats decide, then "Live now". */
export function pillTone(status: LiveStatus): PillTone {
  if (status.phase === 'ended') return 'muted';
  if (status.level === 'open') return 'success';
  if (status.level === 'filling') return 'warning';
  if (status.level === 'full') return 'danger';
  return status.phase === 'live' ? 'accent' : 'muted';
}

/** The one-word form for compact rows. */
export function pillWord(status: LiveStatus): string {
  if (status.phase === 'ended') return 'Ended';
  if (status.level === 'open') return 'Open';
  if (status.level === 'filling') return 'Filling';
  if (status.level === 'full') return 'Full';
  return status.phase === 'live' ? 'Live' : 'Soon';
}

export function StatusPill({ status, compact }: { status: LiveStatus; compact?: boolean }) {
  return (
    <View accessible accessibilityLabel={status.label}>
      <Pill label={compact ? pillWord(status) : status.label} tone={pillTone(status)} />
    </View>
  );
}
