export type HomeSection =
  | 'ticket'
  | 'up-next'
  | 'near-now'
  | 'matches'
  | 'recommended'
  | 'pitches'
  | 'side-events'
  | 'passport'
  | 'speakers'
  | 'word'
  | 'banners';

const byRole: Record<string, HomeSection[]> = {
  Startup: ['up-next', 'matches', 'pitches', 'recommended', 'near-now', 'side-events', 'passport', 'speakers'],
  Investor: ['up-next', 'pitches', 'matches', 'recommended', 'near-now', 'side-events', 'speakers', 'passport'],
  Corporate: ['up-next', 'recommended', 'matches', 'near-now', 'side-events', 'pitches', 'speakers', 'passport'],
  Media: ['up-next', 'speakers', 'recommended', 'near-now', 'side-events', 'pitches', 'passport', 'matches'],
};

const guestOrder: HomeSection[] = ['near-now', 'side-events', 'pitches', 'speakers', 'recommended'];

/** The ordered Home sections for a role. Every list ends with banners then the word of the day. */
export function homeSections(role: string): HomeSection[] {
  const order = byRole[role] ?? guestOrder;
  return ['ticket', ...order, 'banners', 'word'];
}
