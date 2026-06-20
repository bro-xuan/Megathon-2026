// Vapi interviewer assistant — persona + fact-pack injection. No secrets here (safe to import
// anywhere). Live model = Groq llama-3.3-70b-versatile (~0.2s TTFB) via Vapi BYO key, set in
// the Vapi dashboard. GROUNDED-ONLY: the assistant pushes back only when a claim contradicts an
// injected fact; it must never fact-check from its own memory (it hallucinates company facts).
// The exhaustive, structured check is the post-call debrief's job (M3), not the live turn.

import type { FactPack } from './types';

/** Compact, cited fact list for prompt injection. */
function factLines(pack: FactPack): string {
  return pack.facts.map((f) => `- ${f.claim}: ${f.value}`).join('\n');
}

function networkLine(pack: FactPack): string {
  const names = Array.from(new Set(pack.relationships.map((r) => r.to))).slice(0, 30);
  return names.join(', ');
}

export function buildSystemPrompt(pack: FactPack, candidateName = 'the candidate'): string {
  return `You are a sharp, friendly-but-demanding managing director running a live mock investment-banking interview with ${candidateName}. The target company is ${pack.target}.

HOW TO INTERVIEW (voice — keep every turn to 1-3 short sentences):
- Open by asking them to pitch ${pack.target}, then probe. Be conversational, not a quiz machine.
- Steer toward the RELATIONSHIP NETWORK — valuation, owners, investors, board, recent acquisitions, likely acquirers — not just generic technical drills. That is where candidates get caught.
- When the candidate states something that CONTRADICTS a fact in the FACT PACK below, push back firmly but fairly: name the discrepancy and ask them to reconsider (e.g. "You said X — are you sure? Walk me through that."). Do not lecture; make them defend it.

HARD RULES:
- The FACT PACK below is your ONLY source of truth about ${pack.target}. Treat it as current and correct.
- NEVER assert a fact about ${pack.target} from your own memory or training — you are known to hallucinate company facts (acquirers, dates, valuations). If it is not in the pack, do not claim it; ask the candidate instead.
- Do NOT try to comprehensively fact-check every claim out loud — only challenge clear contradictions with the pack. A thorough check happens after the call.
- Stay in character as the interviewer. Don't mention the fact pack or that you are an AI.

=== FACT PACK: ${pack.target} ===
${pack.summary}

KEY CITED FACTS:
${factLines(pack)}

ENTITIES IN THE NETWORK (probe these): ${networkLine(pack)}
=== END FACT PACK ===`;
}

/** Vapi inline assistant config. Pass to vapi.start(assistant) from the browser. */
export function buildAssistant(
  pack: FactPack,
  opts: { candidateName?: string; voiceId?: string } = {},
) {
  return {
    name: `Greenroom — ${pack.target} interview`,
    firstMessage: `Thanks for coming in. Let's get started — pitch me ${pack.target}. Why should we care about it?`,
    model: {
      provider: 'groq' as const,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      messages: [{ role: 'system' as const, content: buildSystemPrompt(pack, opts.candidateName) }],
    },
    transcriber: { provider: 'deepgram' as const, model: 'nova-2' },
    // Voice via Vapi-managed ElevenLabs (BYO key in dashboard). voiceId is injected server-side.
    ...(opts.voiceId
      ? { voice: { provider: '11labs' as const, voiceId: opts.voiceId } }
      : {}),
  };
}
