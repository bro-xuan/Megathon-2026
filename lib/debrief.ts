// Post-call debrief — SERVER-ONLY. The differentiator (M3): the reasoner compares the
// interview transcript against the cited fact pack and produces a citation-dense scorecard.
//
// Provider is latency-insensitive (post-call) → use the stronger reasoner. We dispatch on
// available keys: Claude (claude-opus-4-8) if ANTHROPIC_API_KEY is set, else GLM-5.2 (Z.ai).
// Both are sanctioned by CLAUDE.md ("Claude or GLM-5.2"). GLM is hybrid-reasoning, so we pass
// thinking:{type:"disabled"} (otherwise it spends max_tokens on hidden reasoning_content and
// returns empty content — see CLAUDE.md gotcha).

import { z } from 'zod';
import type { DebriefResult, FactPack, GeneralDebrief, TranscriptTurn } from './types';
import { entityEntries, factEntries, nodeIdForCompany } from './coverage-graph';

// ---- Shared validation schema ----
const ClaimCheckZ = z.object({
  quote: z.string(),
  verdict: z.enum(['verified', 'flagged', 'unverifiable']),
  sourceUrl: z.string().default(''),
  correctValue: z.string().default(''),
  nodeId: z.string().default(''),
});
const FlagZ = z.object({
  quote: z.string(),
  issue: z.string(),
  correctValue: z.string(),
  sourceUrl: z.string().default(''),
  severity: z.enum(['low', 'medium', 'high']),
  recovery: z.enum(['recovered', 'doubled-down', 'not-challenged']).default('not-challenged'),
  nodeId: z.string().default(''),
});
const DebriefZ = z.object({
  claims: z.array(ClaimCheckZ),
  flags: z.array(FlagZ),
  verifiedCount: z.number().default(0),
  totalClaims: z.number().default(0),
  score: z.number(),
  composureNote: z.string().default(''),
});

const SYSTEM = `You are a rigorous investment-banking interview fact-checker. After a mock interview, you receive (1) the interview transcript and (2) a CITED FACT PACK about the target company — the ONLY ground truth you may use.

Your job: reconstruct EVERY factual claim the candidate made about the company, and check each against the fact pack. Citation density is the point — surface every claim, not just the wrong ones.

Rules:
- "quote" must be the candidate's VERBATIM words from the transcript (candidate turns only; never the interviewer's).
- verdict: "verified" if a fact-pack fact supports it; "flagged" if a fact-pack fact contradicts it; "unverifiable" if the pack says nothing about it.
- For verified and flagged claims, set sourceUrl to the most relevant fact's sourceUrl from the pack. For unverifiable, sourceUrl = "".
- For flagged claims, set correctValue to the pack's correct value; otherwise correctValue = "".
- NEVER use your own memory of the company — only the fact pack. If the pack lacks a fact, it is "unverifiable", not "verified".
- Also output "flags": one entry per flagged claim (the bluffs), with a short "issue", the correctValue, the sourceUrl, and a severity (high = a confident, central, provably-wrong claim like valuation/ownership/IPO; medium = a softer error; low = minor).
- recovery (on each flag): what the candidate did once this wrong claim was on the table — the most important behavioural signal. Look at the interviewer turns AFTER the claim. "recovered" = the interviewer pushed back / questioned this specific claim AND the candidate then corrected it, retracted it, hedged, or acknowledged the error. "doubled-down" = the interviewer pushed back AND the candidate repeated, defended, or insisted on the wrong claim anyway. "not-challenged" = the interviewer never tested this specific claim, so it slipped by unexamined. Judge ONLY from the transcript; do not assume a challenge that is not there.
- nodeId: the single best-matching graph-node id for the claim, copied VERBATIM from the [brackets] in the fact pack — the fact topic the claim is about, or a related entity the candidate named (e.g. an investor, board member, acquisition, competitor). If the claim is about the company itself, use that company's id. If nothing in the pack matches, set nodeId to "". Set the same nodeId on the matching "flags" entry.
- verifiedCount = number of "verified" claims; totalClaims = claims.length; score = 0-100 accuracy (start at 100, subtract heavily for high-severity flags, lightly for medium/low; unverifiable claims are neutral).
- composureNote: one or two plain sentences on how the candidate handled BEING CAUGHT OUT — the reveal that matters more than the error itself. Reward recoveries (owning a mistake when pushed) and call out double-downs (insisting on a wrong figure under pressure), which read worse than the original slip. Note any high-severity bluff that went unchallenged as something a real interviewer would have caught. If no bluffs were challenged at all, say the candidate's recovery was never tested this round. Reference what actually happened in the transcript; never invent a challenge.`;

const SHAPE = `Respond with ONLY a single JSON object, no markdown fences, matching exactly:
{"claims":[{"quote":string,"verdict":"verified"|"flagged"|"unverifiable","sourceUrl":string,"correctValue":string,"nodeId":string}],"flags":[{"quote":string,"issue":string,"correctValue":string,"sourceUrl":string,"severity":"low"|"medium"|"high","recovery":"recovered"|"doubled-down"|"not-challenged","nodeId":string}],"verifiedCount":number,"totalClaims":number,"score":number,"composureNote":string}`;

// Structured-output JSON schema (Claude path). Every object: additionalProperties:false, all
// properties required (optional fields use "" sentinel).
const DEBRIEF_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          quote: { type: 'string' },
          verdict: { type: 'string', enum: ['verified', 'flagged', 'unverifiable'] },
          sourceUrl: { type: 'string' },
          correctValue: { type: 'string' },
          nodeId: { type: 'string' },
        },
        required: ['quote', 'verdict', 'sourceUrl', 'correctValue', 'nodeId'],
      },
    },
    flags: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          quote: { type: 'string' },
          issue: { type: 'string' },
          correctValue: { type: 'string' },
          sourceUrl: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          recovery: { type: 'string', enum: ['recovered', 'doubled-down', 'not-challenged'] },
          nodeId: { type: 'string' },
        },
        required: ['quote', 'issue', 'correctValue', 'sourceUrl', 'severity', 'recovery', 'nodeId'],
      },
    },
    verifiedCount: { type: 'integer' },
    totalClaims: { type: 'integer' },
    score: { type: 'integer' },
    composureNote: { type: 'string' },
  },
  required: ['claims', 'flags', 'verifiedCount', 'totalClaims', 'score', 'composureNote'],
} as const;

// The ground-truth fact pack AND the node-id catalog in one block: every fact topic and
// related entity carries its graph-node id in [brackets], so the model can both fact-check
// against the values and tag each claim with the node it lands on (for the coverage graph).
function packForPrompt(packs: FactPack[]): string {
  const targets = packs.map((p) => p.target).join(', ');
  const blocks = packs.map((p) => {
    const facts = factEntries(p)
      .map((f) => `  [${f.id}] (${f.label}) ${f.value}\n     source: ${f.sourceUrl}`)
      .join('\n');
    const ents = entityEntries([p])
      .map((e) => `  [${e.id}] ${e.name} (${e.type})`)
      .join('\n');
    return `### ${p.target}  [${nodeIdForCompany(p.target)}]\nFACT TOPICS:\n${facts}\nRELATED ENTITIES (names the candidate may reference):\n${ents}`;
  });
  return `TARGET COMPANIES: ${targets}\n\nCITED FACT PACK (ground truth — the ONLY facts you may use). Each node carries its id in [brackets]:\n\n${blocks.join('\n\n')}`;
}

function userPrompt(transcript: TranscriptTurn[], packs: FactPack[]): string {
  const t = transcript
    .map((x) => `${x.role === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER'}: ${x.text}`)
    .join('\n');
  return `${packForPrompt(packs)}\n\n---\n\nINTERVIEW TRANSCRIPT:\n${t}\n\nProduce the scorecard.`;
}

function finalize(raw: unknown): DebriefResult {
  const parsed = DebriefZ.parse(raw); // claims/flags now carry nodeId (default "") → passed through
  const verifiedCount = parsed.claims.filter((c) => c.verdict === 'verified').length;
  return {
    claims: parsed.claims,
    flags: parsed.flags,
    verifiedCount,
    totalClaims: parsed.claims.length,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    composureNote: parsed.composureNote,
  };
}

function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start >= 0 && end >= 0 ? body.slice(start, end + 1) : body;
}

export type DebriefProvider = 'claude' | 'glm';

// Scoring provider. Explicit DEBRIEF_PROVIDER wins (we pin GLM-5.2 for the demo — see CLAUDE.md);
// otherwise fall back to whichever key is present (Claude if ANTHROPIC_API_KEY, else GLM).
export function debriefProvider(): DebriefProvider {
  const pinned = process.env.DEBRIEF_PROVIDER?.toLowerCase();
  if (pinned === 'glm' || pinned === 'claude') return pinned;
  return process.env.ANTHROPIC_API_KEY ? 'claude' : 'glm';
}

// ---- Claude path (claude-opus-4-8, adaptive thinking, structured output) ----
async function claudeDebrief(transcript: TranscriptTurn[], packs: FactPack[]): Promise<DebriefResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: DEBRIEF_JSON_SCHEMA },
    },
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt(transcript, packs) }],
  });
  const text = message.content
    .map((b) => ('text' in b && typeof b.text === 'string' ? b.text : ''))
    .join('');
  return finalize(JSON.parse(stripFences(text)));
}

// ---- GLM-5.2 path (Z.ai OpenAI-compatible; thinking disabled so content is populated) ----
async function glmDebrief(transcript: TranscriptTurn[], packs: FactPack[]): Promise<DebriefResult> {
  const key = process.env.GLM_API_KEY;
  if (!key) throw new Error('No debrief key: set ANTHROPIC_API_KEY or GLM_API_KEY');
  const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GLM_MODEL || 'glm-5.2',
      stream: false,
      max_tokens: 8000,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${SYSTEM}\n\n${SHAPE}` },
        { role: 'user', content: userPrompt(transcript, packs) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('GLM returned empty content');
  return finalize(JSON.parse(stripFences(content)));
}

/** Run the (cited) debrief pass with whichever reasoner is configured. Takes the un-merged
 *  prep packs so the prompt's node catalog has per-company ids matching the coverage graph. */
export function buildDebrief(transcript: TranscriptTurn[], packs: FactPack[]): Promise<DebriefResult> {
  return debriefProvider() === 'claude'
    ? claudeDebrief(transcript, packs)
    : glmDebrief(transcript, packs);
}

// ---- General (ungrounded) debrief: delivery coaching, no fact-check ----------------------
// Behavioral/technical tracks have no fact pack, so there are no bluffs to catch. We still
// run a post-call pass, but it grades delivery + reasoning and returns coaching notes.

const GeneralZ = z.object({
  score: z.number(),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

const GENERAL_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer' },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'summary', 'strengths', 'improvements'],
} as const;

const GENERAL_SHAPE = `Respond with ONLY a single JSON object, no markdown fences, matching exactly:
{"score":number,"summary":string,"strengths":[string],"improvements":[string]}`;

function generalSystem(trackTitle: string): string {
  return `You are an experienced investment-banking interview coach. You receive the transcript of a mock "${trackTitle}" round. This round is about DELIVERY and REASONING, not company facts — there is no fact-check here.

Assess the candidate's performance and return coaching:
- score: 0-100 overall (structure, clarity, depth of reasoning, communication; be a fair but demanding MD).
- summary: 1-2 sentences on how they did overall.
- strengths: 2-4 specific things they did well, referencing what they actually said.
- improvements: 2-4 specific, actionable fixes, referencing what they actually said.
Be concrete; quote or paraphrase their words. Never invent claims they did not make.`;
}

function generalUser(transcript: TranscriptTurn[]): string {
  const t = transcript
    .map((x) => `${x.role === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER'}: ${x.text}`)
    .join('\n');
  return `INTERVIEW TRANSCRIPT:\n${t}\n\nProduce the coaching review.`;
}

function finalizeGeneral(raw: unknown): GeneralDebrief {
  const parsed = GeneralZ.parse(raw);
  return {
    mode: 'general',
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    summary: parsed.summary,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
  };
}

async function claudeGeneral(transcript: TranscriptTurn[], trackTitle: string): Promise<GeneralDebrief> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    output_config: { format: { type: 'json_schema', schema: GENERAL_JSON_SCHEMA } },
    system: generalSystem(trackTitle),
    messages: [{ role: 'user', content: generalUser(transcript) }],
  });
  const text = message.content
    .map((b) => ('text' in b && typeof b.text === 'string' ? b.text : ''))
    .join('');
  return finalizeGeneral(JSON.parse(stripFences(text)));
}

async function glmGeneral(transcript: TranscriptTurn[], trackTitle: string): Promise<GeneralDebrief> {
  const key = process.env.GLM_API_KEY;
  if (!key) throw new Error('No debrief key: set ANTHROPIC_API_KEY or GLM_API_KEY');
  const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GLM_MODEL || 'glm-5.2',
      stream: false,
      max_tokens: 4000,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${generalSystem(trackTitle)}\n\n${GENERAL_SHAPE}` },
        { role: 'user', content: generalUser(transcript) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('GLM returned empty content');
  return finalizeGeneral(JSON.parse(stripFences(content)));
}

/** Run the general (delivery-coaching) debrief for an ungrounded track. */
export function buildGeneralDebrief(
  transcript: TranscriptTurn[],
  trackTitle: string,
): Promise<GeneralDebrief> {
  return debriefProvider() === 'claude'
    ? claudeGeneral(transcript, trackTitle)
    : glmGeneral(transcript, trackTitle);
}
