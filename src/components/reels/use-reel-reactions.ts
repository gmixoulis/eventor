import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useReelReactions } from '@/store';

// Likes and saves now live in the store (per account) and the demo database.
export { useReelReactions };

/** True while the app is in the foreground. */
export function useAppActive(): boolean {
  // currentState can start as 'unknown'; only a known background state blocks playback.
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
