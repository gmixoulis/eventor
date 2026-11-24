import { getGoal } from '@/data';
import { shareConcept } from '@/matching/concepts';
import { textSimilarity } from '@/matching/text';
import type { MatchProfile, MatchReason, Selection } from '@/matching/types';
import { WEIGHTS } from '@/matching/weights';

export function overSelectionFactor(selected: number, total: number): number {
  if (selected <= 0) return WEIGHTS.overSelection.floor;
  if (total <= 0) return 1;
  const ratio = selected / total;
  if (ratio <= WEIGHTS.overSelection.start) return 1;
  if (ratio >= WEIGHTS.overSelection.end) return WEIGHTS.overSelection.floor;
  const t =
    (ratio - WEIGHTS.overSelection.start) /
    (WEIGHTS.overSelection.end - WEIGHTS.overSelection.start);
  return 1 - t * (1 - WEIGHTS.overSelection.floor);
}

function complementaryPair(myGoalId: string, theirGoalId: string): boolean {
  if (myGoalId === 'network') return false;
  return getGoal(myGoalId)?.pairsWith === theirGoalId;
}

export function isRecent(lastActiveAt: string, now: Date): boolean {
  const active = new Date(lastActiveAt).getTime();
  if (Number.isNaN(active)) return false;
  return now.getTime() - active <= WEIGHTS.recentDays * 24 * 60 * 60 * 1000;
}

export function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function pairScore(
  me: MatchProfile,
  them: MatchProfile,
  corpus: string[],
  total: number,
  now: Date,
): { score: number; reasons: MatchReason[] } {
  const mySelections = new Map<string, Selection>(me.selections.map((s) => [s.interestId, s]));
  const theirSelections = new Map<string, Selection>(
    them.selections.map((s) => [s.interestId, s]),
  );

  let interestPoints = 0;
  const complementary: MatchReason[] = [];
  const networkingIds: string[] = [];
  const related: MatchReason[] = [];
  const countedMine = new Set<string>();

  for (const [interestId, mySelection] of mySelections) {
    const theirSelection = theirSelections.get(interestId);
    if (!theirSelection) continue;
    countedMine.add(interestId);
    if (complementaryPair(mySelection.goalId, theirSelection.goalId)) {
      interestPoints += WEIGHTS.complementary;
      complementary.push({
        kind: 'complementary',
        interestId,
        myGoalId: mySelection.goalId,
        theirGoalId: theirSelection.goalId,
      });
    } else if (mySelection.goalId === 'network' && theirSelection.goalId === 'network') {
      interestPoints += WEIGHTS.bothNetworking;
      networkingIds.push(interestId);
    } else {
      interestPoints += WEIGHTS.sameGoal;
    }
  }

  for (const [interestId, mySelection] of mySelections) {
    if (countedMine.has(interestId)) continue;
    let best: { theirId: string; complementary: boolean } | null = null;
    for (const [theirId, theirSelection] of theirSelections) {
      if (theirId === interestId) continue;
      if (!shareConcept(interestId, theirId)) continue;
      const isComplementary = complementaryPair(mySelection.goalId, theirSelection.goalId);
      if (!best || (isComplementary && !best.complementary)) {
        best = { theirId, complementary: isComplementary };
      }
    }
    if (best) {
      interestPoints += best.complementary ? WEIGHTS.relatedComplementary : WEIGHTS.related;
      related.push({
        kind: 'related',
        myInterestId: interestId,
        theirInterestId: best.theirId,
      });
    }
  }

  const interestScore =
    interestPoints *
    overSelectionFactor(me.selections.length, total) *
    overSelectionFactor(them.selections.length, total);

  const text = textSimilarity(me.text, them.text, corpus);

  let score = interestScore * (1 + WEIGHTS.text.maxBoost * text.score);
  if (interestScore === 0 && text.score >= WEIGHTS.text.soloThreshold) {
    score = WEIGHTS.text.soloPoints * text.score;
  }

  if (me.industry && them.industry && me.industry === them.industry) {
    score *= WEIGHTS.sameIndustry;
  }
  if (them.lastActiveAt && isRecent(them.lastActiveAt, now)) {
    score *= WEIGHTS.recentActivity;
  }
  score *= Math.min(
    WEIGHTS.acceptedMeetingCap,
    1 + WEIGHTS.acceptedMeetingStep * them.acceptedMeetings,
  );
  if (them.staleRequests > 0) score *= WEIGHTS.staleRequest;
  if (them.freeSlotRatio < WEIGHTS.lowFreeSlots.below) score *= WEIGHTS.lowFreeSlots.factor;

  const reasons: MatchReason[] = [];
  reasons.push(...complementary);
  if (networkingIds.length > 0) reasons.push({ kind: 'networking', interestIds: networkingIds });
  reasons.push(...related);
  if (text.terms.length > 0) reasons.push({ kind: 'text', terms: text.terms });

  return { score, reasons };
}
