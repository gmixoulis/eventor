export type Selection = {
  interestId: string;
  goalId: string;
};

export type MatchProfile = {
  id: string;
  selections: Selection[];
  text: string;
  industry: string;
  role?: string;
  availability?: string[];
  lastActiveAt?: string;
  acceptedMeetings: number;
  staleRequests: number;
  freeSlotRatio: number;
};

export type MatchReason =
  | { kind: 'complementary'; interestId: string; myGoalId: string; theirGoalId: string }
  | { kind: 'networking'; interestIds: string[] }
  | { kind: 'related'; myInterestId: string; theirInterestId: string }
  | { kind: 'text'; terms: string[] }
  | { kind: 'taste' }
  | { kind: 'explore' }
  | { kind: 'slot' };

export type Match = {
  personId: string;
  p: number;
  score: number;
  tier: 'top' | 'good' | null;
  reasons: MatchReason[];
  explore?: boolean;
};

export type ReasonLookups = {
  getInterest: (id: string) => { name: string } | undefined;
  getGoal: (id: string) => { label: string } | undefined;
};
