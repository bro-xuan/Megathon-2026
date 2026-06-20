// Persona distillation — SERVER-ONLY. Reconstruct a real, named interviewer from their public
// traces so the voice agent sounds like *them*, not a generic archetype. Two layers, mirroring
// the rest of Greenroom:
//   KNOWLEDGE (cited) — Cala knowledge_search about the person/their firm/their views → FactPack.
//   STYLE (cited)     — how they actually talk, synthesized by the debrief reasoner from a CITED
//                        corpus of their public words (the same provider as the debrief; latency
//                        doesn't matter — distillation is offline, before any call).
//
// Honesty rules that match the golden rules: quotes are VERBATIM and carry the source URL of the
// segment they came from; we never let the model invent quotes or facts. Style (tone/cadence) is
// inferred from that cited material. Cala knowledge is best-effort — a thin/empty knowledge pack
// still yields a usable, style-driven persona. Distill once, cache to data/personas/<slug>.{json,md}.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { knowledgeSearch } from './cala';
import { normalize, slugify } from './factpack';
import { debriefProvider } from './debrief';
import { ELEVEN_VOICE_IDS, defaultElevenVoiceId } from './voice';
import type { FactPack, PersonaProfile, PersonaQuote } from './types';

const PERSONA_DIR = path.join(process.cwd(), 'data', 'personas');

/** A cited chunk of the person's public words, fed to the style distiller. */
export type CorpusSegment = { text: string; sourceUrl: string; sourceName?: string };

function emptyPack(target: string): FactPack {
  return { target, entityId: '', summary: '', facts: [], relationships: [], fetchedAt: new Date().toISOString() };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '??';
}

// Person-flavoured Cala queries (the company queries in factpack.ts ask about valuation/IPO,
// which is wrong for a person). Progressively simpler, like buildFactPack's fallback chain.
function personSearchInputs(name: string): string[] {
  return [
    `${name} background, role, investing philosophy, and notable views`,
    `${name} career and known positions`,
    name,
  ];
}

/** Best-effort cited knowledge about the person. Cala may 429 or be unconfigured → empty pack. */
async function buildPersonKnowledge(name: string): Promise<FactPack> {
  let last: FactPack | null = null;
  for (const input of personSearchInputs(name)) {
    try {
      const raw = await knowledgeSearch(input);
      const pack = normalize(name, raw, new Date().toISOString());
      if (pack.facts.length > 0 && !/too complex/i.test(pack.summary)) return pack;
      last = pack;
    } catch {
      // Knowledge is the supporting layer, not load-bearing for a persona — keep going.
    }
  }
  return last ?? emptyPack(name);
}

// ---- Style synthesis (LLM, structured) -------------------------------------------------------

type Synth = {
  role: string;
  headline: string;
  objective: string;
  firstMessage: string;
  style: {
    tone: string;
    cadence: string;
    signaturePhrases: string[];
    petTopics: string[];
    tells: string[];
  };
  quotes: PersonaQuote[];
};

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    role: { type: 'string' },
    headline: { type: 'string' },
    objective: { type: 'string' },
    firstMessage: { type: 'string' },
    style: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tone: { type: 'string' },
        cadence: { type: 'string' },
        signaturePhrases: { type: 'array', items: { type: 'string' } },
        petTopics: { type: 'array', items: { type: 'string' } },
        tells: { type: 'array', items: { type: 'string' } },
      },
      required: ['tone', 'cadence', 'signaturePhrases', 'petTopics', 'tells'],
    },
    quotes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string' },
          context: { type: 'string' },
          sourceUrl: { type: 'string' },
          sourceName: { type: 'string' },
        },
        required: ['text', 'context', 'sourceUrl', 'sourceName'],
      },
    },
  },
  required: ['role', 'headline', 'objective', 'firstMessage', 'style', 'quotes'],
} as const;

const SYNTH_SHAPE = `Respond with ONLY a single JSON object, no markdown fences, matching exactly:
{"role":string,"headline":string,"objective":string,"firstMessage":string,"style":{"tone":string,"cadence":string,"signaturePhrases":[string],"petTopics":[string],"tells":[string]},"quotes":[{"text":string,"context":string,"sourceUrl":string,"sourceName":string}]}`;

function synthSystem(roundTitle: string): string {
  return `You are a persona analyst preparing a voice agent to role-play a REAL, named interviewer for a final-round investment-banking interview (the "${roundTitle}" round). You are given (1) cited public material about the person and (2) a cited corpus of their own public words. Distill how this person actually interviews and talks.

Produce:
- role: their real title/affiliation (e.g. "Professor of Finance, NYU Stern").
- headline: one vivid sentence on who they are and why facing them is distinctive.
- objective: what THIS person, specifically, is trying to evaluate in a candidate — in their own frame and priorities.
- firstMessage: the exact opening line they would say to start the call, in their voice (1-2 sentences, spoken, no stage directions).
- style.tone: one paragraph on their manner (warm/blunt/socratic/etc.).
- style.cadence: their turn rhythm (clipped vs. winding, how they pace questions).
- style.signaturePhrases: 3-6 phrases they actually use (prefer ones grounded in the corpus).
- style.petTopics: 3-6 things they reliably steer a conversation toward.
- style.tells: 3-5 concrete ways they push back on or expose a weak/bluffed answer.
- quotes: 3-8 VERBATIM quotes selected ONLY from the provided corpus. Copy the words exactly; set sourceUrl and sourceName to the EXACT source of the segment the quote came from. If the corpus is empty, return an empty quotes array.

HARD RULES:
- NEVER invent a quote. Quotes must be verbatim substrings of the corpus, with the corpus segment's own sourceUrl/sourceName.
- Do NOT assert specific factual claims (valuations, deals, dates) as if true — that is checked elsewhere. Style and priorities are your job.
- Write firstMessage and the style fields so a voice model can convincingly BE this person.`;
}

function synthUser(name: string, knowledge: FactPack, corpus: CorpusSegment[]): string {
  const facts = knowledge.facts.length
    ? knowledge.facts.map((f, i) => `[${i + 1}] (${f.claim}) ${f.value} — source: ${f.sourceUrl}`).join('\n')
    : '(no cited knowledge returned)';
  const corpusBlock = corpus.length
    ? corpus
        .map(
          (c, i) =>
            `--- CORPUS SEGMENT ${i + 1} | source: ${c.sourceName ?? c.sourceUrl} | url: ${c.sourceUrl} ---\n${c.text.trim()}`,
        )
        .join('\n\n')
    : '(no corpus provided — infer style from the cited knowledge and known public reputation; return an empty quotes array)';
  return `PERSON: ${name}

CITED KNOWLEDGE:
${knowledge.summary ? knowledge.summary + '\n\n' : ''}${facts}

CITED CORPUS (their own public words — select verbatim quotes ONLY from here):
${corpusBlock}

Produce the persona JSON.`;
}

function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start >= 0 && end >= 0 ? body.slice(start, end + 1) : body;
}

// Dispatch on the same provider as the debrief (Claude if ANTHROPIC_API_KEY, else GLM-5.2).
async function synthesize(name: string, roundTitle: string, knowledge: FactPack, corpus: CorpusSegment[]): Promise<Synth> {
  const system = synthSystem(roundTitle);
  const user = synthUser(name, knowledge, corpus);

  if (debriefProvider() === 'claude') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      output_config: { format: { type: 'json_schema', schema: SYNTH_SCHEMA } },
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = message.content
      .map((b) => ('text' in b && typeof b.text === 'string' ? b.text : ''))
      .join('');
    return JSON.parse(stripFences(text)) as Synth;
  }

  const key = process.env.GLM_API_KEY;
  if (!key) throw new Error('No distill key: set ANTHROPIC_API_KEY or GLM_API_KEY');
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
        { role: 'system', content: `${system}\n\n${SYNTH_SHAPE}` },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('GLM returned empty content');
  return JSON.parse(stripFences(content)) as Synth;
}

// ---- Distill + persist -----------------------------------------------------------------------

function collectSources(knowledge: FactPack, corpus: CorpusSegment[], quotes: PersonaQuote[]): { name: string; url: string }[] {
  const seen = new Map<string, string>();
  const add = (url?: string, name?: string) => {
    if (!url) return;
    if (!seen.has(url)) seen.set(url, name || url);
  };
  for (const f of knowledge.facts) add(f.sourceUrl, f.sourceName);
  for (const c of corpus) add(c.sourceUrl, c.sourceName);
  for (const q of quotes) add(q.sourceUrl, q.sourceName);
  return [...seen.entries()].map(([url, name]) => ({ url, name }));
}

export type DistillOpts = {
  baseTrack?: string; // round template this person runs (default 'markets')
  roundTitle?: string; // human round label for the synth prompt
  corpus?: CorpusSegment[]; // cited public words (drives style + quotes)
  voiceId?: string; // chosen ElevenLabs pool voice; falls back to a stable per-slug default
};

/** Distill a real person into a PersonaProfile. Does NOT write — call savePersona to persist. */
export async function distillPersona(name: string, opts: DistillOpts = {}): Promise<PersonaProfile> {
  const baseTrack = opts.baseTrack ?? 'markets';
  const corpus = opts.corpus ?? [];
  const slug = slugify(name);
  const knowledge = await buildPersonKnowledge(name);
  const synth = await synthesize(name, opts.roundTitle ?? 'Defend the valuation', knowledge, corpus);

  // Keep only quotes the model actually grounded in the corpus (defends against invented citations).
  const corpusUrls = new Set(corpus.map((c) => c.sourceUrl));
  const quotes = corpus.length
    ? synth.quotes.filter((q) => q.text.trim() && corpusUrls.has(q.sourceUrl))
    : [];

  // Pin a voice: the chosen pool voice if valid, else a stable default keyed on the slug.
  const voiceId =
    opts.voiceId && ELEVEN_VOICE_IDS.has(opts.voiceId) ? opts.voiceId : defaultElevenVoiceId(slug);

  return {
    slug,
    name,
    voiceId,
    role: synth.role,
    avatar: initials(name),
    headline: synth.headline,
    baseTrack,
    objective: synth.objective,
    firstMessage: synth.firstMessage,
    style: synth.style,
    quotes,
    knowledge,
    sources: collectSources(knowledge, corpus, quotes),
    distilledAt: new Date().toISOString(),
  };
}

/** The human dossier (the MD deliverable) — a scouting report on the interviewer. */
export function renderPersonaMarkdown(p: PersonaProfile): string {
  const list = (items: string[]) => (items.length ? items.map((x) => `- ${x}`).join('\n') : '_(none)_');
  const quotes = p.quotes.length
    ? p.quotes
        .map((q) => `> ${q.text}\n>\n> — ${q.context ? q.context + ', ' : ''}[${q.sourceName ?? 'source'}](${q.sourceUrl})`)
        .join('\n\n')
    : '_No cited corpus was provided, so no verbatim quotes were distilled._';
  const facts = p.knowledge.facts.length
    ? p.knowledge.facts.map((f) => `- **${f.claim}:** ${f.value} — [${f.sourceName ?? 'source'}](${f.sourceUrl})`).join('\n')
    : '_No cited knowledge returned from Cala._';
  const sources = p.sources.length ? p.sources.map((s) => `- [${s.name}](${s.url})`).join('\n') : '_(none)_';

  return `# Persona dossier — ${p.name}

**${p.role}**
${p.headline}

- **Round they run:** ${p.baseTrack}
- **Distilled:** ${p.distilledAt}
- **Sources drawn on:** ${p.sources.length}

## What they're evaluating
${p.objective}

## Opening line (in their voice)
> ${p.firstMessage}

## Voice & style
**Tone.** ${p.style.tone}

**Cadence.** ${p.style.cadence}

**Signature phrases**
${list(p.style.signaturePhrases)}

**Pet topics**
${list(p.style.petTopics)}

**How they catch a weak answer**
${list(p.style.tells)}

## Verbatim voice (cited)
${quotes}

## Cited knowledge
${facts}

## Sources
${sources}

---
_Distilled by Greenroom. Style is an approximation reconstructed from public material — not the actual person._
`;
}

/** Persist both the machine JSON and the human MD dossier. */
export async function savePersona(p: PersonaProfile): Promise<{ json: string; md: string }> {
  await mkdir(PERSONA_DIR, { recursive: true });
  const json = path.join(PERSONA_DIR, `${p.slug}.json`);
  const md = path.join(PERSONA_DIR, `${p.slug}.md`);
  await writeFile(json, JSON.stringify(p, null, 2));
  await writeFile(md, renderPersonaMarkdown(p));
  return { json, md };
}

/** Read a cached persona profile (cache-only — never calls Cala/LLM). */
export async function getPersona(slug: string): Promise<PersonaProfile | null> {
  const file = path.join(PERSONA_DIR, `${slugify(slug)}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8')) as PersonaProfile;
}

/** List every distilled persona (lightweight cards for the index). */
export async function listPersonas(): Promise<PersonaProfile[]> {
  if (!existsSync(PERSONA_DIR)) return [];
  const files = (await readdir(PERSONA_DIR)).filter((f) => f.endsWith('.json'));
  const profiles = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(PERSONA_DIR, f), 'utf8')) as PersonaProfile),
  );
  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

/** Read a cited corpus from data/personas/raw/<slug>.json (optional input to the distiller). */
export async function readCorpus(slug: string): Promise<CorpusSegment[]> {
  const file = path.join(PERSONA_DIR, 'raw', `${slug}.json`);
  if (!existsSync(file)) return [];
  return JSON.parse(await readFile(file, 'utf8')) as CorpusSegment[];
}
