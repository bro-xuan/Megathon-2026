// Core domain types for Greenroom. See PRD.md §9.

/** Study-screen grouping (DESIGN.md §8.3). */
export type FactCategory = 'overview' | 'people' | 'ownership' | 'recent';

/** A single sourced fact about the target company. */
export type Fact = {
  claim: string; // short topic label, e.g. "Valuation"
  value: string; // the grounded statement, e.g. "$159B as of the Feb 2026 tender offer"
  sourceUrl: string; // citation — must resolve
  sourceName?: string; // human label for the source
  category?: FactCategory; // for Study grouping
};

/** An edge in the target's relationship network (owners, funders, board, comps). */
export type Relationship = {
  type: string; // e.g. "investor", "acquirer", "board_member", "competitor"
  from: string;
  to: string;
  sourceUrl?: string;
};

/** The pre-fetched, cited ground-truth pack injected into the interviewer prompt. */
export type FactPack = {
  target: string;
  entityId: string;
  summary: string;
  facts: Fact[];
  relationships: Relationship[];
  fetchedAt: string; // ISO timestamp
};

/** A bluff caught in the debrief: a claim that contradicts the fact pack. */
export type FactCheckFlag = {
  quote: string;
  issue: string;
  correctValue: string;
  sourceUrl: string;
  severity: 'low' | 'medium' | 'high';
};

/** Every factual claim the candidate made, checked against the pack (citation density). */
export type ClaimCheck = {
  quote: string;
  verdict: 'verified' | 'flagged' | 'unverifiable';
  sourceUrl?: string;
  correctValue?: string;
};

/** One turn of the interview transcript (candidate vs. interviewer). */
export type TranscriptTurn = {
  role: 'candidate' | 'interviewer';
  text: string;
};

/** The full post-call scorecard produced by the Claude debrief pass (GROUNDED tracks). */
export type DebriefResult = {
  mode?: 'cited'; // absent = cited (back-compat with fixtures)
  claims: ClaimCheck[];
  flags: FactCheckFlag[];
  verifiedCount: number;
  totalClaims: number;
  score: number; // 0–100
};

/** Delivery-coaching debrief for UNGROUNDED tracks (behavioral/technical) — no fact-check. */
export type GeneralDebrief = {
  mode: 'general';
  score: number; // 0–100 delivery
  summary: string;
  strengths: string[];
  improvements: string[];
};

/** Either debrief shape — discriminated by `mode`. */
export type AnyDebrief = DebriefResult | GeneralDebrief;
