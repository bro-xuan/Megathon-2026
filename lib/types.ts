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

// ── Persona distillation ─────────────────────────────────────────────────────
// A "distilled person" is a real, named interviewer (the partner you'll actually
// face in a final round) reconstructed from their public traces. Same composition
// as a Track — persona × cited knowledge × objective — but the PERSONA is a real
// person and carries a STYLE layer (how they actually talk, grounded in cited
// quotes). Distilled before the call and cached to data/personas/<slug>.{json,md};
// the JSON is injected into the interviewer prompt, the MD is the human dossier.

/** A verbatim quote pulled from the person's public material — the voice evidence. */
export type PersonaQuote = {
  text: string; // exact words, used to anchor the agent's register
  context?: string; // where/when they said it
  sourceUrl: string; // citation — must resolve
  sourceName?: string;
};

/** How the person actually speaks + what they fixate on (distilled style layer). */
export type PersonaStyle = {
  tone: string; // one-paragraph description of their manner
  cadence: string; // turn rhythm — short/clipped vs. winding, etc.
  signaturePhrases: string[]; // things they actually say
  petTopics: string[]; // what they always steer toward
  tells: string[]; // how they push back / catch a weak answer
};

/** The distilled interviewer. Layers a real persona + style onto a base round template. */
export type PersonaProfile = {
  slug: string;
  name: string; // "Aswath Damodaran"
  role: string; // "Professor of Finance, NYU Stern"
  avatar: string; // 2-char initials
  headline: string; // one-line who-they-are for the card
  baseTrack: string; // TrackId of the round template they run (markets/stock-pitch/…)
  objective: string; // what they evaluate, in their frame
  firstMessage: string; // opening line, in their voice
  style: PersonaStyle;
  quotes: PersonaQuote[]; // cited verbatim quotes (may be empty if no corpus)
  knowledge: FactPack; // cited facts about the person / their firm / their views (Cala)
  sources: { name: string; url: string }[]; // every source the distillation drew on
  distilledAt: string; // ISO timestamp
};
