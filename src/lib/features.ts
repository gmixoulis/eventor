import { matchesPrefix } from '@/lib/paths';

export type FeatureId =
  | 'schedule'
  | 'mySchedule'
  | 'people'
  | 'meetings'
  | 'speakers'
  | 'sponsors'
  | 'guide'
  | 'map'
  | 'sideEvents'
  | 'sideEventRequests'
  | 'ask'
  | 'passport'
  | 'leaderboard'
  | 'reels'
  | 'announcements'
  | 'qrCode'
  | 'tickets';

export type Feature = {
  id: FeatureId;
  label: string;
  default: boolean;
  /** Parents: this feature is off whenever one of them is off. */
  dependsOn: FeatureId[];
  /** Route prefixes this feature owns; nested routes count ("/session" owns "/session/s1"). */
  paths: string[];
};

export type FeatureFlags = Record<FeatureId, boolean>;

/** Every feature an organizer can switch off. Parents come before their children. Home, Menu, Search, Settings, sign-in and Organizer tools are always on. */
export const FEATURES: Feature[] = [
  { id: 'schedule', label: 'Schedule', default: true, dependsOn: [], paths: ['/schedule', '/session'] },
  { id: 'mySchedule', label: 'My schedule', default: true, dependsOn: ['schedule'], paths: ['/my-schedule'] },
  { id: 'people', label: 'People and matching', default: true, dependsOn: [], paths: ['/people', '/person'] },
  { id: 'meetings', label: 'Meetings and chat', default: true, dependsOn: ['people'], paths: ['/chat'] },
  { id: 'speakers', label: 'Speakers', default: true, dependsOn: [], paths: ['/speakers', '/speaker'] },
  { id: 'sponsors', label: 'Sponsors', default: true, dependsOn: [], paths: ['/sponsors', '/sponsor'] },
  { id: 'guide', label: 'Guide', default: true, dependsOn: [], paths: ['/guide'] },
  { id: 'map', label: 'Map', default: true, dependsOn: [], paths: ['/map', '/map2'] },
  { id: 'sideEvents', label: 'Side events', default: true, dependsOn: [], paths: ['/side-events', '/side-event'] },
  { id: 'sideEventRequests', label: 'Side event requests', default: true, dependsOn: ['sideEvents'], paths: ['/organizer/requests', '/organizer/admins'] },
  { id: 'ask', label: 'Ask', default: true, dependsOn: [], paths: ['/ask'] },
  { id: 'passport', label: 'Passport', default: true, dependsOn: [], paths: ['/passport'] },
  { id: 'leaderboard', label: 'Leaderboard', default: true, dependsOn: ['passport'], paths: ['/passport/leaderboard'] },
  { id: 'reels', label: 'Pitch reels', default: true, dependsOn: [], paths: ['/reels'] },
  { id: 'announcements', label: 'Announcements', default: true, dependsOn: [], paths: ['/announcements'] },
  { id: 'qrCode', label: 'QR code', default: true, dependsOn: [], paths: ['/qr'] },
  { id: 'tickets', label: 'Tickets', default: true, dependsOn: [], paths: ['/tickets'] },
];

const byId = Object.fromEntries(FEATURES.map((feature) => [feature.id, feature])) as Record<FeatureId, Feature>;

export function featureLabel(id: FeatureId): string {
  return byId[id].label;
}

/** Defaults plus the saved overrides; a parent that is off turns its children off. Non-boolean values are ignored. */
export function mergeFeatures(overrides: Partial<Record<FeatureId, unknown>> = {}): FeatureFlags {
  const flags = {} as FeatureFlags;
  // FEATURES lists parents first, so a parent's final value is known when its child is merged.
  for (const feature of FEATURES) {
    const own = overrides[feature.id];
    flags[feature.id] = (typeof own === 'boolean' ? own : feature.default) && feature.dependsOn.every((parent) => flags[parent]);
  }
  return flags;
}

/** The overrides after switching one feature; a value equal to the default is dropped, so only differences are saved. */
export function withFeature(
  overrides: Partial<Record<FeatureId, boolean>>,
  id: FeatureId,
  on: boolean,
): Partial<Record<FeatureId, boolean>> {
  const next = { ...overrides };
  if (on === byId[id].default) delete next[id];
  else next[id] = on;
  return next;
}

/** The feature owning `pathname` (the longest matching prefix wins), or null for an always-on screen. */
export function featureForPath(pathname: string): FeatureId | null {
  let best: { id: FeatureId; length: number } | null = null;
  for (const feature of FEATURES) {
    for (const path of feature.paths) {
      if (matchesPrefix(pathname, [path]) && path.length > (best?.length ?? 0)) best = { id: feature.id, length: path.length };
    }
  }
  return best?.id ?? null;
}

export function isPathEnabled(pathname: string, flags: FeatureFlags): boolean {
  const id = featureForPath(pathname);
  return id === null || flags[id];
}
