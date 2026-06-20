// Vapi interviewer assistant — persona + fact-pack injection. No secrets here (safe to import
// anywhere). Live model = Groq llama-3.3-70b-versatile (~0.2s TTFB) via Vapi BYO key, set in
// the Vapi dashboard. GROUNDED-ONLY: on grounded tracks the assistant pushes back only when a
// claim contradicts an injected fact; it must never fact-check from its own memory (it
// hallucinates company facts). The exhaustive, structured check is the post-call debrief (M3).
//
// The interview is keyed on TRACK, not company. Grounded tracks (stock-pitch, markets) inject
// the whole PREP LIBRARY (multiple companies) and let the candidate pick which to pitch.
// Ungrounded tracks (behavioral, technical) carry no company facts — they're delivery drills.

import type { FactPack, PersonaProfile } from './types';
import { buildPersonaTrack, type Track } from './tracks';
import { pickInterviewerVoice, START_SPEAKING_PLAN, STOP_SPEAKING_PLAN } from './voice';

/** Compact, cited fact list for prompt injection. */
function factLines(pack: FactPack): string {
  return pack.facts.map((f) => `- ${f.claim}: ${f.value}`).join('\n');
}

// Finance vocab Deepgram otherwise mishears into nearest common words. Boosted so the
// transcript stays usable for the debrief's fact-check.
const IB_VOCAB = [
  'valuation', 'acquisition', 'acquirer', 'EBITDA', 'revenue', 'multiple', 'tender',
  'IPO', 'equity', 'investor', 'board', 'merger', 'comps', 'margin', 'ARR', 'dilution',
  'stake', 'portfolio', 'funding', 'cap',
];

// Generic corporate-suffix noise we don't want to spend keyword slots on.
const KEYWORD_STOP = new Set([
  'the', 'and', 'inc', 'corp', 'company', 'group', 'holdings', 'of', 'for', 'co', 'llc', 'ltd',
]);

/**
 * Deepgram keyword-boost list built from the companies + network names actually in this call,
 * so STT stops mangling "Stripe"/"Sequoia"/"EBITDA". Syntax: "term:intensifier".
 */
function boostKeywords(packs: FactPack[]): string[] {
  const names = new Set<string>();
  for (const p of packs) {
    names.add(p.target);
    for (const r of p.relationships) names.add(r.to);
  }
  const tokens = new Set<string>();
  for (const name of names) {
    for (const word of name.split(/[\s/,&]+/)) {
      const t = word.replace(/[^A-Za-z0-9]/g, '');
      if (t.length >= 3 && !KEYWORD_STOP.has(t.toLowerCase())) tokens.add(t);
    }
  }
  return [...tokens, ...IB_VOCAB].slice(0, 50).map((t) => `${t}:2`);
}

function networkLine(pack: FactPack): string {
  const names = Array.from(new Set(pack.relationships.map((r) => r.to))).slice(0, 24);
  return names.join(', ');
}

/** One "=== FACT PACK: Company ===" block per prepped company. */
function packBlock(pack: FactPack): string {
  return `=== FACT PACK: ${pack.target} ===
${pack.summary}

KEY CITED FACTS:
${factLines(pack)}

ENTITIES IN THE NETWORK (probe these): ${networkLine(pack)}
=== END FACT PACK: ${pack.target} ===`;
}

function groundedPrompt(track: Track, packs: FactPack[], candidateName: string): string {
  const companies = packs.map((p) => p.target).join(', ');
  return `You are a sharp, friendly-but-demanding ${track.personaPrompt} running a live mock investment-banking interview with ${candidateName}. This is the "${track.title}" round — the "commercial awareness" bucket of a real IB interview (pitch a company / discuss a deal / defend a valuation). It is the part candidates can't fake by memorizing, so make it count.

${track.focus}

HOW TO INTERVIEW (voice — keep every turn to 1-3 short sentences, ONE question at a time):
- The candidate prepped these companies: ${companies}. Have THEM pick one, then drill that single name deep — a real banker goes deep on one company, not a survey.
- Run the real arc: open-ended ask → make them COMMIT to a specific number, name, or date → follow up on that exact answer → pressure-test it. Banking rewards specificity and punishes vagueness, so don't accept "it's worth a lot" — push for the figure.
- Steer every line into the facts the pack actually contains, because that is where bluffs surface: current valuation and how it moved over time, owners / lead investors / board, recent acquisitions (target, price, rationale) and likely acquirers, financials (revenue, growth, losses, burn, cash), and IPO / liquidity status.
- Ask bankerly questions whose answers are IN the pack so you can judge the reply, e.g.: "What's it worth today, and how did you get there?" · "Walk me through a recent deal it did — rationale, price, who paid." · "Who are its biggest backers?" · "It's losing money at that valuation — justify the multiple." · "Public or private? How do shareholders get liquidity without an IPO?"
- When a claim CONTRADICTS the matching FACT PACK, push back firmly but fairly: name the discrepancy and make them reconsider (e.g. "You said ninety billion — are you sure? Walk me through that."). Make them defend it; don't lecture and don't hand them the right number.

HARD RULES:
- The FACT PACKS below are your ONLY source of truth about these companies. Treat them as current and correct.
- NEVER assert a company fact from your own memory or training — you are known to hallucinate acquirers, dates, and valuations. If it is not in a pack, do not claim it; ask the candidate instead.
- Only challenge clear contradictions with a pack. Do NOT try to comprehensively fact-check every claim out loud — a thorough check happens after the call.
- Stay in character as the interviewer. Don't mention the fact packs or that you are an AI.

${packs.map(packBlock).join('\n\n')}`;
}

function ungroundedPrompt(track: Track, candidateName: string): string {
  return `You are a sharp, friendly-but-demanding ${track.personaPrompt} running a live mock investment-banking interview with ${candidateName}. This is the "${track.title}" round.

${track.focus}

HOW TO INTERVIEW (voice — keep every turn to 1-3 short sentences):
- Be conversational, not a quiz machine. Ask one thing at a time and follow up on their answer.
- Push for STRUCTURE and SPECIFICITY — make them justify each step of their reasoning.

HARD RULES:
- This round is about delivery and reasoning, not company facts. Do NOT make factual claims about specific real companies' valuations, owners, or deals — you are known to hallucinate these. Keep the questions general or hypothetical.
- Stay in character as the interviewer. Don't mention that you are an AI.`;
}

/** Build the interviewer system prompt for a track. Grounded tracks inject the prep packs. */
export function buildSystemPrompt(
  track: Track,
  packs: FactPack[],
  candidateName = 'the candidate',
): string {
  return track.grounded && packs.length > 0
    ? groundedPrompt(track, packs, candidateName)
    : ungroundedPrompt(track, candidateName);
}

// ── Persona-driven prompt (distilled real interviewer) ───────────────────────────────────────
// Same grounded mechanics as groundedPrompt, but the interviewer IS a specific real person: we
// inject their distilled STYLE (tone/cadence/phrases/tells), their VERBATIM voice (cited quotes),
// and their own cited background ("about you"). The company FACT PACKS stay the only source of
// truth about the companies — the persona changes WHO asks and HOW, never the grounding rules.

function bullets(items: string[]): string {
  return items.length ? items.map((x) => `- ${x}`).join('\n') : '- (none)';
}

function voiceBlock(p: PersonaProfile): string {
  if (!p.quotes.length) return '';
  const lines = p.quotes.slice(0, 6).map((q) => `- "${q.text}"`).join('\n');
  return `\nYOUR OWN WORDS (verbatim — match this register; don't recite them mechanically):\n${lines}\n`;
}

function aboutYouBlock(p: PersonaProfile): string {
  if (!p.knowledge.facts.length) return '';
  const facts = p.knowledge.facts.slice(0, 12).map((f) => `- ${f.claim}: ${f.value}`).join('\n');
  return `\nABOUT YOU (cited background you may speak to as yourself — never invent beyond this):\n${facts}\n`;
}

export function buildPersonaSystemPrompt(
  profile: PersonaProfile,
  packs: FactPack[],
  candidateName = 'the candidate',
): string {
  const companies = packs.map((p) => p.target).join(', ');
  return `You ARE ${profile.name} — ${profile.role}. You are personally conducting a final-round investment-banking interview with ${candidateName}. Stay fully in character as ${profile.name}: never break character, never say you are an AI, a model, or "an assistant".

YOUR OBJECTIVE: ${profile.objective}

HOW YOU TALK (match this voice precisely — voice call, so keep every turn to 1-3 short sentences):
- Tone: ${profile.style.tone}
- Cadence: ${profile.style.cadence}
- Phrases you actually use:
${bullets(profile.style.signaturePhrases)}
- You reliably steer the conversation toward:
${bullets(profile.style.petTopics)}
- How you catch a weak or bluffed answer:
${bullets(profile.style.tells)}
${voiceBlock(profile)}
THE INTERVIEW:
- ${candidateName} has prepped these companies: ${companies}. Let THEM pick one to pitch, then go deep on it the way YOU would — through your own lens and pet topics.
- When ${candidateName} states something that CONTRADICTS a fact in the matching FACT PACK below, push back in your own voice: name the discrepancy and make them defend it. Don't lecture.

HARD RULES (grounding — these override your persona):
- The FACT PACKS below are your ONLY source of truth about these companies. Treat them as current and correct.
- NEVER assert a company fact (valuation, owner, acquirer, date) from your own memory — even as ${profile.name}, you hallucinate these. If it isn't in a pack, ask the candidate instead of claiming it.
- Only challenge clear contradictions with a pack. Do NOT comprehensively fact-check out loud — a thorough check happens after the call.
${aboutYouBlock(profile)}
${packs.map(packBlock).join('\n\n')}`;
}

/** Vapi inline assistant config for a distilled persona running a grounded round. */
export function buildPersonaAssistant(
  profile: PersonaProfile,
  packs: FactPack[],
  opts: { candidateName?: string; voiceId?: string } = {},
) {
  const track = buildPersonaTrack(profile);
  return {
    name: `Greenroom — ${profile.name}`,
    firstMessage: profile.firstMessage,
    model: {
      provider: 'groq' as const,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      messages: [
        { role: 'system' as const, content: buildPersonaSystemPrompt(profile, packs, opts.candidateName) },
      ],
    },
    transcriber: {
      provider: 'deepgram' as const,
      model: 'nova-2' as const,
      language: 'en' as const,
      smartFormat: true,
      keywords: track.grounded ? boostKeywords(packs) : IB_VOCAB.map((t) => `${t}:2`),
    },
    startSpeakingPlan: START_SPEAKING_PLAN,
    stopSpeakingPlan: STOP_SPEAKING_PLAN,
    // Always attach a real voice (Aura-2 by default, keyed on the persona slug so each distilled
    // person sounds distinct; ElevenLabs when opts.voiceId is provided). No voice block → Vapi's
    // robotic default, which is what we're fixing.
    voice: pickInterviewerVoice(profile.slug, opts.voiceId),
  };
}

/** Vapi inline assistant config. Pass to vapi.start(assistant) from the browser. */
export function buildAssistant(
  track: Track,
  packs: FactPack[],
  opts: { candidateName?: string; voiceId?: string } = {},
) {
  return {
    name: `Greenroom — ${track.title}`,
    firstMessage: track.firstMessage,
    model: {
      provider: 'groq' as const,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      messages: [
        { role: 'system' as const, content: buildSystemPrompt(track, packs, opts.candidateName) },
      ],
    },
    // nova-2 + en + keyword boost: keeps company/finance terms intact (nova-2 supports the
    // "term:intensifier" keyword param; nova-3 dropped it for keyterm). smartFormat normalizes
    // numbers/$ so valuations read cleanly in the transcript.
    transcriber: {
      provider: 'deepgram' as const,
      model: 'nova-2' as const,
      language: 'en' as const,
      smartFormat: true,
      keywords: track.grounded ? boostKeywords(packs) : IB_VOCAB.map((t) => `${t}:2`),
    },
    // Turn-taking. Without these Vapi falls back to a fixed silence timer, which is why the
    // interviewer felt like it didn't notice you stopped and replied late. smartEndpointingPlan
    // is an ML turn detector (mid-sentence pause vs. done talking); stopSpeakingPlan lets the
    // candidate barge in. Shared + retuned in lib/voice.ts.
    startSpeakingPlan: START_SPEAKING_PLAN,
    stopSpeakingPlan: STOP_SPEAKING_PLAN,
    // Always attach a real voice (Aura-2 by default via Vapi-managed Deepgram — no BYO key needed;
    // keyed on track id so the rounds sound distinct). ElevenLabs when opts.voiceId is provided.
    voice: pickInterviewerVoice(track.id, opts.voiceId),
  };
}
