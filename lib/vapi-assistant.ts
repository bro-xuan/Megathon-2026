// Vapi interviewer assistant — persona + fact-pack injection. No secrets here (safe to import
// anywhere). Live model = Groq llama-3.3-70b-versatile (~0.2s TTFB) via Vapi BYO key, set in
// the Vapi dashboard. GROUNDED-ONLY: on grounded tracks the assistant pushes back only when a
// claim contradicts an injected fact; it must never fact-check from its own memory (it
// hallucinates company facts). The exhaustive, structured check is the post-call debrief (M3).
//
// The interview is keyed on TRACK, not company. Grounded tracks (stock-pitch, markets) inject
// the whole PREP LIBRARY (multiple companies) and let the candidate pick which to pitch.
// Ungrounded tracks (behavioral, technical) carry no company facts — they're delivery drills.

import type { FactPack } from './types';
import type { Track } from './tracks';

/** Compact, cited fact list for prompt injection. */
function factLines(pack: FactPack): string {
  return pack.facts.map((f) => `- ${f.claim}: ${f.value}`).join('\n');
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
  return `You are a sharp, friendly-but-demanding ${track.personaPrompt} running a live mock investment-banking interview with ${candidateName}. This is the "${track.title}" round.

${track.focus}

HOW TO INTERVIEW (voice — keep every turn to 1-3 short sentences):
- The candidate has prepped these companies: ${companies}. Let THEM pick one to talk about, then go deep on that one.
- Steer toward the RELATIONSHIP NETWORK — valuation, owners, investors, board, recent acquisitions, likely acquirers — not just generic drills. That is where candidates get caught.
- When the candidate states something that CONTRADICTS a fact in the matching FACT PACK below, push back firmly but fairly: name the discrepancy and ask them to reconsider (e.g. "You said X — are you sure? Walk me through that."). Make them defend it; don't lecture.

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
    transcriber: { provider: 'deepgram' as const, model: 'nova-2' },
    // Voice via Vapi-managed ElevenLabs (BYO key in dashboard). voiceId is injected server-side.
    ...(opts.voiceId
      ? { voice: { provider: '11labs' as const, voiceId: opts.voiceId } }
      : {}),
  };
}
