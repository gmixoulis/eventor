// Generative identity: a person's selections become a small ornamental composition.
// Personal layers (rosette, meander band, wave, role dots) carry the person's own rotation.
// Interest layers are placed from the interest id alone, so two people with the same interest
// get the same sub-motif in the same absolute position and the overlap is visible.
import type { MeanderTurns } from '@/art/meander';
import { hashString } from '@/lib/utils';

/** Theme tokens a spec may use. The component maps them to the active palette. */
export type Tone = 'primary' | 'accent' | 'primarySoft' | 'text';
export type InkSlot = 'ink' | 'spark';
export type InterestMotif = 'key' | 'fan' | 'rings' | 'dots' | 'bud';

export type IdentityLayer =
  | { id: string; kind: 'rosette'; petals: number; slot: InkSlot }
  | { id: string; kind: 'meander'; turns: MeanderTurns; repeats: number }
  | { id: string; kind: 'wave'; frequency: number; amplitude: number }
  | { id: string; kind: 'role'; count: number }
  | { id: string; kind: 'interest'; motif: InterestMotif; position: number; ring: 0 | 1; quarter: number; slot: InkSlot };

export type IdentitySpec = {
  /** Degrees, applied to the personal layers only. */
  rotation: number;
  /** Two or three slots: ground and ink always, spark when any layer uses it. */
  palette: { ground: Tone; ink: Tone; spark?: Tone };
  layers: IdentityLayer[];
};

export type IdentityInput = {
  id: string;
  selections: { interestId: string; goalId: string }[];
  role?: string;
};

/** Positions per interest ring; ring 1 is offset by half a step. */
export const INTEREST_POSITIONS = 12;
/** Above this many interests the composition gets noisy; the rest are left out (sorted, so stable). */
export const MAX_INTEREST_LAYERS = 8;
const MOTIFS: InterestMotif[] = ['key', 'fan', 'rings', 'dots', 'bud'];

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function interestLayer(interestId: string): Extract<IdentityLayer, { kind: 'interest' }> {
  const h = hashString(`interest:${interestId}`);
  return {
    id: `interest:${interestId}`,
    kind: 'interest',
    motif: MOTIFS[(h >>> 8) % MOTIFS.length],
    position: h % INTEREST_POSITIONS,
    ring: ((h >>> 4) & 1) as 0 | 1,
    quarter: (h >>> 12) % 4,
    slot: (h >>> 16) & 1 ? 'spark' : 'ink',
  };
}

export function identitySpec(input: IdentityInput): IdentitySpec {
  const personal = hashString(`person:${input.id}`);
  const interests = unique(input.selections.map((s) => s.interestId));
  const goals = unique(input.selections.map((s) => s.goalId));
  const interestHash = hashString(interests.join('|'));
  const goalHash = hashString(goals.join('|'));

  const petals = Math.min(12, Math.max(4, input.selections.length + 3));
  const layers: IdentityLayer[] = [
    {
      id: `meander:${interestHash % 2 ? 2 : 1}-${10 + (interestHash >>> 3) % 5}`,
      kind: 'meander',
      turns: interestHash % 2 ? 2 : 1,
      repeats: 10 + (interestHash >>> 3) % 5,
    },
  ];
  if (input.role) {
    layers.push({ id: `role:${input.role}`, kind: 'role', count: 3 + (hashString(`role:${input.role}`) % 6) });
  }
  for (const id of interests.slice(0, MAX_INTEREST_LAYERS)) layers.push(interestLayer(id));
  if (goals.length) {
    const frequency = 3 + goals.length + (goalHash % 4);
    layers.push({ id: `wave:${goals.join('+')}`, kind: 'wave', frequency, amplitude: 1.2 + ((goalHash >>> 4) % 3) * 0.4 });
  }
  layers.push({ id: `rosette:${petals}`, kind: 'rosette', petals, slot: (personal >>> 9) & 1 ? 'spark' : 'ink' });

  const usesSpark = layers.some((l) => (l.kind === 'interest' || l.kind === 'rosette') && l.slot === 'spark');
  return {
    rotation: personal % 360,
    palette: {
      ground: 'primarySoft',
      ink: (personal >>> 5) & 1 ? 'text' : 'primary',
      ...(usesSpark ? { spark: 'accent' as const } : {}),
    },
    layers,
  };
}

/** Layer ids both specs contain, sorted, so the result is the same whichever way round it is called. */
export function sharedLayers(a: IdentitySpec, b: IdentitySpec): string[] {
  const ids = new Set(b.layers.map((l) => l.id));
  return a.layers.map((l) => l.id).filter((id) => ids.has(id)).sort();
}
