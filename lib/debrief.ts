// Post-call debrief — SERVER-ONLY. The differentiator (M3): the reasoner compares the
// interview transcript against the cited fact pack and produces a citation-dense scorecard.
//
// Provider is latency-insensitive (post-call) → use the stronger reasoner. We dispatch on
// available keys: Claude (claude-opus-4-8) if ANTHROPIC_API_KEY is set, else GLM-5.2 (Z.ai).
// Both are sanctioned by CLAUDE.md ("Claude or GLM-5.2"). GLM is hybrid-reasoning, so we pass
// thinking:{type:"disabled"} (otherwise it spends max_tokens on hidden reasoning_content and
// returns empty content — see CLAUDE.md gotcha).

import { z } from 'zod';
import type { DebriefResult, FactPack, TranscriptTurn } from './types';

// ---- Shared validation schema ----
const ClaimCheckZ = z.object({
  quote: z.string(),
  verdict: z.enum(['verified', 'flagged', 'unverifiable']),
  sourceUrl: z.string().default(''),
  correctValue: z.string().default(''),
});
const FlagZ = z.object({
  quote: z.string(),
  issue: z.string(),
  correctValue: z.string(),
  sourceUrl: z.string().default(''),
  severity: z.enum(['low', 'medium', 'high']),
});
const DebriefZ = z.object({
  claims: z.array(ClaimCheckZ),
  flags: z.array(FlagZ),
  verifiedCount: z.number().default(0),
  totalClaims: z.number().default(0),
  score: z.number(),
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
- verifiedCount = number of "verified" claims; totalClaims = claims.length; score = 0-100 accuracy (start at 100, subtract heavily for high-severity flags, lightly for medium/low; unverifiable claims are neutral).`;

const SHAPE = `Respond with ONLY a single JSON object, no markdown fences, matching exactly:
{"claims":[{"quote":string,"verdict":"verified"|"flagged"|"unverifiable","sourceUrl":string,"correctValue":string}],"flags":[{"quote":string,"issue":string,"correctValue":string,"sourceUrl":string,"severity":"low"|"medium"|"high"}],"verifiedCount":number,"totalClaims":number,"score":number}`;

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
        },
        required: ['quote', 'verdict', 'sourceUrl', 'correctValue'],
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
        },
        required: ['quote', 'issue', 'correctValue', 'sourceUrl', 'severity'],
      },
    },
    verifiedCount: { type: 'integer' },
    totalClaims: { type: 'integer' },
    score: { type: 'integer' },
  },
  required: ['claims', 'flags', 'verifiedCount', 'totalClaims', 'score'],
} as const;

function packForPrompt(pack: FactPack): string {
  const facts = pack.facts
    .map((f, i) => `[${i + 1}] (${f.claim}) ${f.value}\n    source: ${f.sourceUrl}`)
    .join('\n');
  return `TARGET: ${pack.target}\n\nCITED FACT PACK (ground truth):\n${facts}`;
}

function userPrompt(transcript: TranscriptTurn[], pack: FactPack): string {
  const t = transcript
    .map((x) => `${x.role === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER'}: ${x.text}`)
    .join('\n');
  return `${packForPrompt(pack)}\n\n---\n\nINTERVIEW TRANSCRIPT:\n${t}\n\nProduce the scorecard.`;
}

function finalize(raw: unknown): DebriefResult {
  const parsed = DebriefZ.parse(raw);
  const verifiedCount = parsed.claims.filter((c) => c.verdict === 'verified').length;
  return {
    claims: parsed.claims,
    flags: parsed.flags,
    verifiedCount,
    totalClaims: parsed.claims.length,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
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

export function debriefProvider(): DebriefProvider {
  return process.env.ANTHROPIC_API_KEY ? 'claude' : 'glm';
}

// ---- Claude path (claude-opus-4-8, adaptive thinking, structured output) ----
async function claudeDebrief(transcript: TranscriptTurn[], pack: FactPack): Promise<DebriefResult> {
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
    messages: [{ role: 'user', content: userPrompt(transcript, pack) }],
  });
  const text = message.content
    .map((b) => ('text' in b && typeof b.text === 'string' ? b.text : ''))
    .join('');
  return finalize(JSON.parse(stripFences(text)));
}

// ---- GLM-5.2 path (Z.ai OpenAI-compatible; thinking disabled so content is populated) ----
async function glmDebrief(transcript: TranscriptTurn[], pack: FactPack): Promise<DebriefResult> {
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
        { role: 'user', content: userPrompt(transcript, pack) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('GLM returned empty content');
  return finalize(JSON.parse(stripFences(content)));
}

/** Run the debrief pass with whichever reasoner is configured. */
export function buildDebrief(transcript: TranscriptTurn[], pack: FactPack): Promise<DebriefResult> {
  return debriefProvider() === 'claude'
    ? claudeDebrief(transcript, pack)
    : glmDebrief(transcript, pack);
}
