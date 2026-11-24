import type { MatchReason, ReasonLookups } from '@/matching/types';

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** "A", "A and B", "A, B and C". */
function joinList(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** A goal label as a verb phrase after "want to": drops a leading "Want to" and fills "this" with the interest. */
function goalPhrase(label: string | undefined, interest: string): string {
  const text = (label ?? 'this').replace(/^want to\s+/i, '');
  if (/\bthis\b/.test(text)) return lowerFirst(text.replace('this', () => interest));
  // Labels without "this" ("Find a mentor", "Explore getting or buying") still need to name the interest.
  return lowerFirst(/buying$/.test(text) ? `${text} ${interest}` : `${text} in ${interest}`);
}

/** Drops repeated terms, case-insensitive, keeping the first spelling. */
function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
}

export function describeReason(reason: MatchReason, lookups: ReasonLookups): string {
  switch (reason.kind) {
    case 'complementary': {
      const interest = lookups.getInterest(reason.interestId)?.name ?? 'this interest';
      const mine = goalPhrase(lookups.getGoal(reason.myGoalId)?.label, interest);
      const theirs = goalPhrase(lookups.getGoal(reason.theirGoalId)?.label, interest);
      return `You want to ${mine} and they want to ${theirs}.`;
    }
    case 'networking': {
      const names = reason.interestIds.map((id) => lookups.getInterest(id)?.name ?? id);
      return `You both network about ${joinList(names)}.`;
    }
    case 'related': {
      const mine = lookups.getInterest(reason.myInterestId)?.name ?? 'this';
      const theirs = lookups.getInterest(reason.theirInterestId)?.name ?? 'this';
      if (mine === theirs) return `You are both interested in ${mine}.`;
      return `Your interest in ${mine} is close to their interest in ${theirs}.`;
    }
    case 'text': {
      if (reason.terms.length === 0) return 'Your introductions describe similar work.';
      return `Similar focus: ${joinList(uniqueTerms(reason.terms))}.`;
    }
    case 'taste':
      return 'Similar to people you have connected with.';
    case 'explore':
      return 'Something different: we are showing you a wider range of people.';
    case 'slot':
      return 'You are both free at the same time.';
  }
}

/** One short line for tight places (Home): the full sentence lives on the People screen and profile. */
export function shortReason(reason: MatchReason, lookups: ReasonLookups): string {
  switch (reason.kind) {
    case 'complementary':
      return `Goals that fit in ${lookups.getInterest(reason.interestId)?.name ?? 'a shared interest'}`;
    case 'networking': {
      const [first, ...rest] = reason.interestIds.map((id) => lookups.getInterest(id)?.name ?? id);
      return rest.length ? `Both network about ${first} +${rest.length}` : `Both network about ${first}`;
    }
    case 'related': {
      const mine = lookups.getInterest(reason.myInterestId)?.name ?? 'this';
      const theirs = lookups.getInterest(reason.theirInterestId)?.name ?? 'this';
      return mine === theirs ? `Both into ${mine}` : `${mine} meets ${theirs}`;
    }
    case 'text':
      return reason.terms.length ? `Similar focus: ${reason.terms[0]}` : 'Similar work';
    case 'taste':
      return 'Like people you connected with';
    case 'explore':
      return 'Something different';
    case 'slot':
      return 'Free at the same time';
  }
}
