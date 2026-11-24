import type { VideoSource } from 'expo-video';

import { listPitches, type Pitch } from '@/data/pitches';

export type Reel = Pitch & {
  video: VideoSource;
  poster: number;
  durationSec: number;
  /** Likes from other attendees; the user's own like is added on top. */
  baseLikes: number;
};

// Placeholder clips (8 s each) stand in for the real one-minute pitches.
const media: Record<string, Omit<Reel, keyof Pitch>> = {
  'reel-001': {
    video: require('../../assets/reels/reel-1.mp4'),
    poster: require('../../assets/reels/reel-1.jpg'),
    durationSec: 60,
    baseLikes: 214,
  },
  'reel-002': {
    video: require('../../assets/reels/reel-2.mp4'),
    poster: require('../../assets/reels/reel-2.jpg'),
    durationSec: 60,
    baseLikes: 187,
  },
  'reel-melody-minds': {
    video: require('../../assets/reels/reel-3.mp4'),
    poster: require('../../assets/reels/reel-3.jpg'),
    durationSec: 60,
    baseLikes: 152,
  },
  'reel-003': {
    video: require('../../assets/reels/reel-4.mp4'),
    poster: require('../../assets/reels/reel-4.jpg'),
    durationSec: 60,
    baseLikes: 236,
  },
  'reel-harbor-health': {
    video: require('../../assets/reels/reel-5.mp4'),
    poster: require('../../assets/reels/reel-5.jpg'),
    durationSec: 60,
    baseLikes: 98,
  },
  'reel-pixel-forge': {
    video: require('../../assets/reels/reel-6.mp4'),
    poster: require('../../assets/reels/reel-6.jpg'),
    durationSec: 60,
    baseLikes: 141,
  },
};

const reels: Reel[] = listPitches().map((pitch) => ({ ...pitch, ...media[pitch.id] }));

export function listReels(): Reel[] {
  return reels;
}
