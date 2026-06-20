// Sparring-partner registry. The front door is keyed on TRACK (the partner you spar with),
// not a company. A sparring partner = PERSONA (who they are) × KNOWLEDGE (the cited Cala pack
// they grill you against — the moat) × OBJECTIVE (what they probe). Companies are PREP MATERIAL
// (data/factpacks/*) bound to the grounded partners and injected before the call — see
// lib/factpack.ts getPrepPacks().
//
// Two grounded partners (Cala load-bearing — cited bluff-catch, both on the SAME prep library so
// the roster demonstrates the persona×objective composition model) are the hero; two ungrounded
// partners (behavioral/technical) are table stakes any LLM can run. The `grounded` flag drives
// whether we inject the prep packs + produce the cited debrief vs. the general coaching debrief.
//
// Backend keys on `id` + `grounded` + `focus` + `firstMessage` + `title` (api/assistant,
// api/debrief, vapi-assistant) — keep those stable. The rest is UI/persona metadata.

import type { PersonaProfile } from './types';

export type TrackId = 'stock-pitch' | 'markets' | 'behavioral' | 'technical';

/** Interview arena. Only investment-banking is live for the demo; the rest sell the roadmap. */
export type DomainId = 'investment-banking' | 'sales' | 'consulting' | 'medicine';

export type Domain = { id: DomainId; label: string; live: boolean };

export const DOMAINS: Domain[] = [
  { id: 'investment-banking', label: 'Investment Banking', live: true },
  { id: 'sales', label: 'Sales', live: false },
  { id: 'consulting', label: 'Consulting', live: false },
  { id: 'medicine', label: 'Med School', live: false },
];

export type Track = {
  id: TrackId;
  domain: DomainId;

  // ── Persona (the "who") ──
  persona: string; // partner name shown across the UI, e.g. "The Managing Director"
  avatar: string; // 2-char initials for the call avatar
  personaPrompt: string; // role phrase injected into the system prompt (drives tone)
  whoLine: string; // one-line persona description for the card / briefing

  // ── Knowledge (the cited spine — the moat) ──
  grounded: boolean; // grounded → inject prep packs + cited debrief
  knows: readonly string[]; // company packs this partner knows cold (cited); [] when ungrounded
  knowledgeLine: string; // what they know, shown on the card + briefing

  // ── Objective + live behaviour ──
  title: string; // objective label, e.g. "Stock pitch"
  tagline: string; // one-line card blurb
  firstMessage: string; // the partner's opening line
  focus: string; // objective guidance injected into the system prompt
};

/** Curated demo prep library — the companies the grounded partners are bound to. Slugs → data/factpacks/*. */
export const PREP_TARGETS = ['Stripe', 'OpenAI'] as const;

export const TRACKS: Track[] = [
  {
    id: 'stock-pitch',
    domain: 'investment-banking',
    persona: 'The Managing Director',
    avatar: 'MD',
    personaPrompt: 'managing director',
    whoLine:
      "A senior banker who's heard a thousand pitches. A vague thesis bores him; a wrong fact ends the conversation.",
    grounded: true,
    knows: PREP_TARGETS,
    knowledgeLine: 'Knows Stripe & OpenAI cold — every claim checked against a cited source.',
    title: 'Stock pitch',
    tagline:
      "Pitch a company you've prepped. State a number wrong and he shows you the real one — with the source.",
    firstMessage:
      "Thanks for coming in. Let's start with a stock pitch — pick any company you've prepped and pitch it to me. What's your thesis, and what's it worth?",
    focus:
      'Round type: the classic STOCK PITCH. Have the candidate pick one prepped company and pitch it as an investment — thesis, what it is worth, why now. Then attack the numbers a pitch lives or dies on: the current valuation and how it has moved, revenue and growth (and for a loss-maker, the path to profit), who the major backers are, and the catalysts and risks. Anchor every challenge to a specific figure in the pack; a vague pitch is a failed pitch.',
  },
  {
    id: 'markets',
    domain: 'investment-banking',
    persona: 'The Skeptical VC',
    avatar: 'VC',
    personaPrompt: 'skeptical venture capitalist',
    whoLine:
      "An investor who assumes you're wrong until you prove it. Push a number you can't back and he pounces.",
    grounded: true,
    knows: PREP_TARGETS,
    knowledgeLine: 'Knows Stripe & OpenAI cold — valuation, ownership, funding, IPO status, all cited.',
    title: 'The deal & the valuation',
    tagline:
      'Talk through a recent deal and defend what the company is worth. The question that is hardest to fake — every claim checked against cited data.',
    firstMessage:
      "I'll be blunt — I see a lot of pitches. Pick a company you follow, walk me through a recent deal it did, and then tell me what it's actually worth. I'll push.",
    focus:
      "Round type: the DEAL DISCUSSION + VALUATION grilling — the commercial question that is hardest to fake. First make the candidate walk through a recent deal the company did (an acquisition or a funding round) — rationale, price, and who paid whom (e.g. Stripe acquiring Bridge or weighing PayPal; OpenAI's mega-rounds, Tomoro, or the DeployCo backing). Then make them defend the current valuation against the fundamentals — for a loss-maker like OpenAI, the operating loss vs. the multiple; for a private name like Stripe, how tender-offer pricing and liquidity work without an IPO. Pounce on any deal detail, price, or backer that contradicts the cited data.",
  },
  {
    id: 'behavioral',
    domain: 'investment-banking',
    persona: 'The Behavioral Lead',
    avatar: 'BL',
    personaPrompt: 'behavioral interviewer',
    whoLine:
      'Wants your story tight and specific. Delivery practice — any AI does this; nothing is fact-checked.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Delivery & structure only — no cited fact-checking.',
    title: 'Behavioral',
    tagline: '"Why banking?", walk me through your story. Delivery practice — any AI does this.',
    firstMessage:
      "Let's start with you — walk me through your story. Why investment banking, and why now?",
    focus:
      'Run a behavioral round: motivation, resume walk-through, strengths/weaknesses, "why this bank". Probe for structure and specificity. This is delivery coaching, not a fact-check.',
  },
  {
    id: 'technical',
    domain: 'investment-banking',
    persona: 'The Technical Examiner',
    avatar: 'TE',
    personaPrompt: 'technical interviewer',
    whoLine:
      'Drills DCF, accounting, and LBO mechanics. Table stakes — any AI does this; nothing is fact-checked.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Delivery & reasoning only — no company fact-checking.',
    title: 'Technical',
    tagline: 'DCF, accounting, LBO drills. Table stakes — any AI does this.',
    firstMessage:
      "Let's do some technicals. Walk me through a DCF — start with how you get to unlevered free cash flow.",
    focus:
      'Run a technical round: valuation (DCF/comps/precedents), the three statements, LBO mechanics, enterprise vs. equity value. Probe the reasoning. This is delivery coaching, not a company fact-check.',
  },
];

export function getTrack(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}

export function getPartnersByDomain(domain: DomainId): Track[] {
  return TRACKS.filter((t) => t.domain === domain);
}

export const GROUNDED_TRACKS = TRACKS.filter((t) => t.grounded);
export const UNGROUNDED_TRACKS = TRACKS.filter((t) => !t.grounded);

/**
 * Derive a Track from a distilled persona. The persona REPLACES the archetype (name, voice,
 * objective, opening line) but inherits the base round's mechanics — crucially its `id`,
 * `grounded`, and `knows`, so the existing api/assistant, api/debrief, and spar wiring all work
 * unchanged (the call is still e.g. a grounded "markets" round, just run by a real named person).
 */
export function buildPersonaTrack(p: PersonaProfile): Track {
  const base = getTrack(p.baseTrack) ?? GROUNDED_TRACKS[0] ?? TRACKS[0];
  return {
    ...base,
    persona: p.name,
    avatar: p.avatar,
    personaPrompt: p.role,
    whoLine: p.headline,
    tagline: p.objective,
    firstMessage: p.firstMessage,
    focus: p.objective,
  };
}
