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
//
// ── Product framing: simulate any hard conversation ──
// One level ABOVE the interview machinery below sits CONVERSATION_CATEGORIES — the kinds of
// hard conversation a user can choose to practice (interview, investor pitch, negotiation, a
// difficult personal talk). Only the INTERVIEW category is built for the demo; the rest are
// coming-soon tiles that sell the breadth WITHOUT pretending to be done. Two tiers:
//   • GROUNDED (Cala load-bearing — facts are checkable against cited data → bluff-catch debrief):
//     interview, investor pitch, and the fact-backed parts of negotiation.
//   • RELATIONAL (no ground truth → general coaching debrief, the `buildGeneralDebrief` path):
//     break-ups, hard feedback, letting someone go.
// The demo runs ONE grounded category end-to-end (interview). The menu shows the vision.

import type { PersonaProfile } from './types';

export type TrackId =
  | 'stock-pitch'
  | 'markets'
  | 'behavioral'
  | 'technical'
  // Mock partners for the other arenas — interactive but ungrounded (no Cala packs). Not part of
  // the demo; they exist so every domain tab opens a real roster instead of a "coming soon" card.
  | 'sales-discovery'
  | 'sales-objection'
  | 'consulting-case'
  | 'consulting-fit'
  | 'med-mmi'
  | 'med-clinical';

// ── Top-level menu: the kind of hard conversation you want to practice ──
// This is the landing-page picker. `interview` is the one built category (it opens into the
// DOMAINS → TRACKS flow below); everything else is a coming-soon tile. `grounded` flags the
// tier (cited bluff-catch vs general coaching). Keep the built path (`interview`) live: true.

export type CategoryId = 'interview' | 'investor-pitch' | 'negotiation' | 'difficult-personal';

export type ConversationCategory = {
  id: CategoryId;
  label: string; // tile heading, e.g. "Job interview"
  blurb: string; // one-line tile description
  grounded: boolean; // facts checkable against cited data (Cala load-bearing) → bluff-catch debrief
  live: boolean; // built for the demo vs. roadmap tile
  examples: readonly string[]; // concrete scenarios under this category (sell the depth)
};

/** The hard-conversation menu. Only `interview` is built; the rest are honest roadmap tiles. */
export const CONVERSATION_CATEGORIES: ConversationCategory[] = [
  {
    id: 'interview',
    label: 'Job interview',
    blurb: 'Sit a high-stakes interview against someone who knows the facts cold and catches your bluffs.',
    grounded: true,
    live: true,
    examples: ['IB stock pitch', 'Deal & valuation grilling', 'Behavioral', 'Technical'],
  },
  {
    id: 'investor-pitch',
    label: 'Investor pitch',
    blurb: 'Pitch a skeptical VC who has read your market and pushes on every number.',
    grounded: true,
    live: false,
    examples: ['Seed pitch', 'Metrics grilling', 'Competitive landscape'],
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    blurb: 'Ask for the raise, backed by real comp data — or hold the line in a deal.',
    grounded: true, // the fact-backed half (comp benchmarks, market rates) is Cala-checkable
    live: false,
    examples: ['Ask for a raise', 'Vendor / contract', 'Job offer'],
  },
  {
    id: 'difficult-personal',
    label: 'Difficult personal talk',
    blurb: 'The conversations with no script — practice the words before they count.',
    grounded: false, // no ground truth → general coaching debrief, not bluff-catch
    live: false,
    examples: ['Break up with a partner', 'Give hard feedback', 'Let someone go'],
  },
];

export const getCategory = (id: string): ConversationCategory | undefined =>
  CONVERSATION_CATEGORIES.find((c) => c.id === id);

/** Interview arena. Only investment-banking is live for the demo; the rest sell the roadmap. */
export type DomainId = 'investment-banking' | 'sales' | 'consulting' | 'medicine';

export type Domain = { id: DomainId; label: string; live: boolean };

// Investment Banking is the grounded hero (Cala load-bearing). The rest are interactive but
// ungrounded mock arenas — `demo: false` marks "not shown on stage" without disabling the tab.
export const DOMAINS: Domain[] = [
  { id: 'investment-banking', label: 'Investment Banking', live: true },
  { id: 'sales', label: 'Sales', live: true },
  { id: 'consulting', label: 'Consulting', live: true },
  { id: 'medicine', label: 'Med School', live: true },
];

export type Track = {
  id: TrackId;
  domain: DomainId;

  // ── Persona (the "who") ──
  persona: string; // archetype label, e.g. "The Managing Director" (kept for internal reference)
  name: string; // the interviewer's human name — the heading shown across the UI, e.g. "Marcus Halloway"
  role: string; // their title/description shown under the name, e.g. "Managing Director"
  portrait?: string; // headshot path under /public; falls back to `avatar` initials when absent
  avatar: string; // 2-char initials for the avatar fallback
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
  aggressive?: boolean; // grounded-prompt tone: theatrical, intimidating pushback (delivery only — grounding rules unchanged)
};

/** Curated demo prep library — the companies the grounded partners are bound to. Slugs → data/factpacks/*. */
export const PREP_TARGETS = ['Stripe', 'OpenAI'] as const;

export const TRACKS: Track[] = [
  {
    id: 'stock-pitch',
    domain: 'investment-banking',
    persona: 'The Managing Director',
    name: 'Marcus Halloway',
    role: 'Managing Director',
    portrait: '/portraits/stock-pitch.jpg',
    avatar: 'MH',
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
      "Sit down. You've got one shot — pick a company you prepped and pitch it. What is it, and what's it worth? Don't waste my time.",
    focus:
      'Round type: the classic STOCK PITCH. Have the candidate pick one prepped company and pitch it as an investment — thesis, what it is worth, why now. Then attack the numbers a pitch lives or dies on: the current valuation and how it has moved, revenue and growth (and for a loss-maker, the path to profit), who the major backers are, and the catalysts and risks. Anchor every challenge to a specific figure in the pack; a vague pitch is a failed pitch.',
    aggressive: true,
  },
  {
    id: 'markets',
    domain: 'investment-banking',
    persona: 'The Skeptical VC',
    name: 'Adrian Voss',
    role: 'Skeptical VC',
    portrait: '/portraits/markets.jpg',
    avatar: 'AV',
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
    name: 'Claire Donovan',
    role: 'Behavioral Lead',
    portrait: '/portraits/behavioral.jpg',
    avatar: 'CD',
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
    name: 'Ethan Brandt',
    role: 'Technical Examiner',
    portrait: '/portraits/technical.jpg',
    avatar: 'EB',
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

  // ── Mock partners (ungrounded) for the non-IB arenas. Interactive, but not part of the demo
  // and not Cala-grounded — they run the general delivery-coaching debrief, like behavioral. ──
  {
    id: 'sales-discovery',
    domain: 'sales',
    persona: 'The VP of Sales',
    name: 'Dana Whitfield',
    role: 'VP of Sales',
    portrait: '/portraits/sales-vp.jpg',
    avatar: 'DW',
    personaPrompt: 'VP of sales',
    whoLine: 'Has sat through a thousand pitches. Lead with product and she tunes out; find the pain and she leans in.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Discovery technique & delivery — no cited fact-checking.',
    title: 'Discovery call',
    tagline: 'Run a discovery call on a skeptical buyer — surface the pain before you ever pitch.',
    firstMessage:
      "Thanks for hopping on. Before you pitch me anything — what made you reach out, and what problem are you actually trying to solve?",
    focus:
      'Run a sales DISCOVERY call: qualify the buyer, uncover the real pain, quantify its impact, and map the decision process. Reward active listening and punish pitching too early. Delivery coaching, not a fact-check.',
  },
  {
    id: 'sales-objection',
    domain: 'sales',
    persona: 'The Hard-Nosed Buyer',
    name: 'Greg Mason',
    role: 'Procurement Lead',
    portrait: '/portraits/sales-buyer.jpg',
    avatar: 'GM',
    personaPrompt: 'hard-nosed procurement lead',
    whoLine: 'Negotiates for a living and smells discomfort. Cave on price once and he keeps pushing.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Objection handling & delivery — no cited fact-checking.',
    title: 'Objection handling',
    tagline: 'Handle a price-sensitive buyer throwing every objection — without caving on value.',
    firstMessage:
      "I'll be straight with you — your price is high and I've got two cheaper quotes on my desk. Why shouldn't I just go with them?",
    focus:
      'Run an OBJECTION-HANDLING round: price, competitor, timing, and "no budget" objections. Probe whether the candidate reframes to value, stays composed, and asks before answering. Delivery coaching, not a fact-check.',
  },
  {
    id: 'consulting-case',
    domain: 'consulting',
    persona: 'The Case Partner',
    name: 'Elena Marsh',
    role: 'Engagement Manager',
    portrait: '/portraits/consulting-case.jpg',
    avatar: 'EM',
    personaPrompt: 'management consulting engagement manager',
    whoLine: 'Lives in issue trees. A scattered answer loses her; a clean structure earns the next question.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Structure & problem-solving — no cited fact-checking.',
    title: 'Case interview',
    tagline: 'Crack a market-sizing and profitability case out loud — structure first, math second.',
    firstMessage:
      "Let's do a case. Our client is a regional coffee chain whose profits are down 20% year over year. How would you figure out why?",
    focus:
      'Run a CONSULTING CASE (profitability / market-sizing): look for a clear issue tree, hypothesis-driven thinking, clean mental math, and a crisp recommendation at the end. Delivery coaching, not a fact-check.',
  },
  {
    id: 'consulting-fit',
    domain: 'consulting',
    persona: 'The Fit Interviewer',
    name: 'Daniel Cho',
    role: 'Principal',
    portrait: '/portraits/consulting-fit.jpg',
    avatar: 'DC',
    personaPrompt: 'consulting principal running a personal-experience interview',
    whoLine: 'Wants the story behind the story. Stays on a thread until he hits what you actually did.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Storytelling & delivery — no cited fact-checking.',
    title: 'Fit & leadership',
    tagline: 'Tell a leadership story tight enough to survive follow-ups — impact, conflict, result.',
    firstMessage:
      "Tell me about a time you led a team through something hard. Be specific — I'm going to dig in.",
    focus:
      'Run a CONSULTING FIT / PEI round: leadership, conflict, and impact stories. Probe for situation-action-result structure, specificity, and personal ownership. Delivery coaching, not a fact-check.',
  },
  {
    id: 'med-mmi',
    domain: 'medicine',
    persona: 'The Admissions Interviewer',
    name: 'Dr. Hannah Reid',
    role: 'Admissions Faculty',
    portrait: '/portraits/med-mmi.jpg',
    avatar: 'HR',
    personaPrompt: 'medical school admissions interviewer running an MMI station',
    whoLine: 'Reads composure as much as content. A one-sided answer worries her; balanced reasoning reassures her.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Ethical reasoning & communication — no cited fact-checking.',
    title: 'MMI ethics station',
    tagline: 'Work an ethics MMI station under time pressure — reason out loud, weigh both sides.',
    firstMessage:
      "Here's your station. A close friend asks you to share answers for an exam you've already taken. What do you do, and why?",
    focus:
      'Run a medical MMI ETHICS station: present the scenario, then probe for structured ethical reasoning (both sides, principles, stakeholders), empathy, and composure under time pressure. Delivery coaching, not a fact-check.',
  },
  {
    id: 'med-clinical',
    domain: 'medicine',
    persona: 'The Clinical Examiner',
    name: 'Dr. Aaron Feld',
    role: 'Attending Physician',
    portrait: '/portraits/med-clinical.jpg',
    avatar: 'AF',
    personaPrompt: 'attending physician running a clinical-reasoning viva',
    whoLine: 'Cares about how you think, not what you memorized. Jumps on a differential with no red flags.',
    grounded: false,
    knows: [],
    knowledgeLine: 'Clinical reasoning & communication — no cited fact-checking.',
    title: 'Clinical reasoning',
    tagline: 'Talk through a differential out loud — key history, red flags, and the next step.',
    firstMessage:
      "A 55-year-old comes in with chest pain that started an hour ago. Walk me through how you'd think about it.",
    focus:
      'Run a CLINICAL REASONING station: build a differential, ask for the key history, flag the red flags, and propose next steps. Probe the reasoning process, not memorized facts. Delivery coaching, not a fact-check.',
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
    name: p.name,
    role: p.role,
    portrait: undefined, // distilled people have no headshot → initials avatar
    avatar: p.avatar,
    personaPrompt: p.role,
    whoLine: p.headline,
    tagline: p.objective,
    firstMessage: p.firstMessage,
    focus: p.objective,
  };
}
