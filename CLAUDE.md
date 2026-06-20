# CLAUDE.md — Greenroom (repo instructions for AI sessions)

Read this first. Then `PRD.md` (what/why + architecture), `DESIGN.md` (UI), `TASKS.md`
(what's next). Record any new decision or API quirk in the log at the bottom of this file.

## What this is
**Greenroom** — a voice-based mock-interviewer (hero: IB/finance interview) grounded in
**cited real-company data**. It catches you when you bluff a fact. Hackathon project
(Megathon 2026), ~1.5 day build, targeting the **Cala.ai** and **Vapi** sponsor prizes.

## Golden rules
1. **De-risk before building UI.** Confirm Cala + Vapi work via `scripts/test-*.ts` (M0).
2. **Grounding before the call, scoring after.** Pre-fetch a cited fact pack → inject into
   the Vapi prompt. Do NOT fact-check live per turn (Cala = 10 req/min; Vapi tool <1s).
   Structured fact-checks come from the **post-call Claude pass**.
3. **Protect M3** (fact-check + debrief) — it's the differentiator. The graph (M4) is the
   cut line.
4. **Curate the demo** — 1–2 companies with rich Cala coverage; no arbitrary input on stage.
5. **Keys are server-only** except `NEXT_PUBLIC_VAPI_PUBLIC_KEY`. Cala/Anthropic/Vapi-private
   keys never reach the client; all Cala traffic via `/api/factpack`.
6. **Cache Cala results** to `data/factpacks/*.json` — protect the 100-credit free tier.

## Conventions
- Next.js 15 App Router + TypeScript + Tailwind. Components in `app/`, server logic in
  `lib/` and `app/api/`.
- **CSS:** fluid responsive only — `html { font-size: clamp(16px,1.15vw,24px) }`, `rem`
  units, `min(90%, …)` widths. No fixed `px` font sizes. (See `DESIGN.md`.)
- Conventional commits (`feat:`, `fix:`, `chore:`). Commit at each milestone. Work on `main`
  for speed; branch only for risky spikes.
- Keep mock/fallback mode (`?mock=1`) a thin branch off the real path (canned fact pack +
  recorded call) so a venue/network failure can't kill the demo.

## Commands (fill in once scaffolded)
- Dev: `npm run dev`
- Cala smoke test: `npx tsx scripts/test-cala.ts`
- Vapi smoke test: `npx tsx scripts/test-vapi.ts`
- Deploy: push to `main` → Vercel (set env vars in dashboard).

## Env vars (see `.env.example`)
Server-only: `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `GROQ_API_KEY` (live interviewer),
`ANTHROPIC_API_KEY` and/or `GLM_API_KEY` (debrief reasoner),
optional `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`), `DEEPGRAM_API_KEY`,
optional `MOLLIE_API_KEY` (test key, only for the M5 paywall stretch).
Client: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.

## Don't
- Don't depend on Wispr Flow's API (partnership-gated; dropped).
- Don't query Cala on every conversational turn.
- Don't ship secret keys to the browser.
- Don't let the graph (M4) jeopardize M0–M3.
- Don't touch Mollie until the full product works — the paywall (M6) is the **last** step.

## Decision log & API quirks (append newest at top)

**M5 polish + Cala "too complex" guard fixed (2026-06-20):** Production `next build` clean (11
routes, TS passes). (1) **Cala rejects over-long compound `knowledge_search` queries** for some
entities with a degenerate summary `"This question is too complex to answer fully…"` and **0
facts** — this had silently cached + committed an **empty OpenAI pack**. `buildFactPack` now
tries a moderate query then falls back to progressively simpler ones (`searchInputs()`), skipping
any degenerate result (`isDegenerate`). Rebuilt `openai.json`: 9 cited facts (incl. the **IPO
catch**, sourced to **Ars Technica** — HTTP 200, no Bloomberg paywall, so the old TODO is moot)
+ 31 relationships. Stripe pack left untouched (frozen/verified). (2) Global **sponsor footer**
in `layout.tsx` on every page + discreet **"Sample debrief →"** link to `/debrief/mock-stripe`;
Spar error state offers the same fallback (venue/Vapi-failure insurance). Browser voice call +
Vercel deploy still pending.

**Vapi keys live + Groq BYO configured (2026-06-20):** `VAPI_PRIVATE_KEY` +
`NEXT_PUBLIC_VAPI_PUBLIC_KEY` in `.env`. REST auth verified (`GET /call` → 200; 0 prior calls,
so the transcript shape is confirmed on the first real call). Registered the **Groq** provider
credential via `POST https://api.vapi.ai/credential {provider:"groq",apiKey}` → 201. **ElevenLabs
failed: 401** (the `ELEVENLABS_API_KEY` in `.env` is invalid/expired — Vapi validates against
11labs on create). Until a valid key is supplied, voice falls back to **Vapi's built-in default
voice** (`/api/assistant` omits the 11labs voice unless `VAPI_USE_ELEVENLABS=1`). `/api/assistant`
verified: returns Groq `llama-3.3-70b-versatile` + Deepgram + injected fact pack (8.7k-char
grounded prompt incl. the $159B catch). The actual WebRTC voice call still needs a browser+mic.

**Debrief reasoner = GLM-5.2 (2026-06-20):** `.env` has `GLM_API_KEY` (Z.ai), not Anthropic.
`lib/debrief.ts` dispatches: Claude (`claude-opus-4-8`) if `ANTHROPIC_API_KEY` set, else GLM-5.2
via Z.ai (`thinking:{type:"disabled"}` so content is populated). Verified end-to-end on a
synthetic Stripe transcript: $65B bluff → flagged as $159B with the Yahoo source, 3/5 verified.

**Cala API VERIFIED (2026-06-20)** — corrects the stale "verify if stale" block below; see
`scripts/test-cala.ts` + `data/cala-raw/*.json`. Base `https://api.cala.ai`, header `X-API-KEY`.
- **`knowledge_search` is the PRIMARY (and sufficient) source.** `POST /v1/knowledge/search`
  body **`{ input: string }`** (NOT `query`). Returns `{ content, explainability[], context[],
  entities[] }`: `content` = grounded markdown summary (recent + dated — great for prompt
  injection); `context[]` = cited evidence chunks, citations at
  **`context[].origins[].source.{name,url}`**; `explainability[]` = `{ content (a claim),
  references: [context.id] }` → the claim→source map that powers the citation-dense scorecard;
  `entities[]` = `{id,name,entity_type}` related-entity network (use for the relationship list/graph).
- `entity_search` = **`GET /v1/entities?name=...`** (NOT POST) → `{ entities:[...] }`; returns
  multiple/duplicate matches, some sparse — pick by richness, don't assume `[0]`.
- `retrieve_entity` = `POST /v1/entities/{uuid}` body `{}` → profile, but **`relationships`
  come back EMPTY** (tried depth/include/expand/hops — all empty). **Do NOT rely on it for the
  network; the relationships live in `knowledge_search` context prose + `entities`.**
- Free tier 100 credits/mo, 10 req/min → cache packs. Console `console.cala.ai`.

**Scaffold (2026-06-20):** repo is now a **Next.js 16.2.9 + React 19.2.4** app (App Router, TS,
Tailwind v4, no src dir, import alias `@/*`). Newer than training data — Next bundles its own
docs at `node_modules/next/dist/docs/` (read before using new Next APIs). Pinned
`turbopack.root` in `next.config.ts` (a `~/pnpm-lock.yaml` otherwise mis-infers the workspace root).
`lib/cala.ts` + `lib/types.ts` written; `npx tsc --noEmit` clean; `npm run dev` → HTTP 200.

**Decisions (2026-06-20):** Split the interviewer LLM by latency. **Live (Spar) = Groq
`llama-3.3-70b-versatile`** via Vapi BYO key — measured **~0.2s TTFB** streaming (vs ~1.7s
GLM, ~0.7–1s Claude Haiku). Live model is **grounded-only**: it answers from the injected
fact pack and must NOT fact-check from its own memory (all tested models, incl. 70B,
hallucinate company facts; `llama-3.1-8b-instant` is faster but worst — rejected).
**Debrief (post-call) = Claude or GLM-5.2** — latency-insensitive, use the stronger reasoner;
this is where the "Claude" story now lives. Z.ai coding-plan endpoint
`https://api.z.ai/api/coding/paas/v4` (OpenAI-compatible) serves GLM up to **glm-5.2**
(verified via `GET /models`); GLM models are hybrid-reasoning → pass `thinking:{type:"disabled"}`
for any latency-sensitive call. Repo helper: `node scripts/glm-review.mjs <file>`.

**Decisions (2026-06-19):** Cala + Vapi are load-bearing (both prizes). Wispr Flow dropped
(API partnership-gated). Fact-check = pre-fetched cited fact pack + post-call Claude pass
(not live per-turn). Scope = Spar + Fact-check + Study graph, with the graph as the cut
line. Stack = Next.js 15 + TS + Tailwind, Claude interviewer via Vapi, Vercel.

**Cala (verify if stale):** base `https://api.cala.ai`, header `X-API-KEY`. `knowledge_search`
(`POST /v1/knowledge/search`) returns cited prose + entities — citations at
`context[].origins[].source.{name,url}`; prefer it when sources matter. `entity_search`
(`POST /v1/entities` → UUID), `retrieve_entity` (`POST /v1/entities/{id}` → profile +
relationships). Free tier 100 credits/mo, **10 req/min** (429 on limit) → cache packs.
Console `console.cala.ai`, docs `docs.cala.ai`.

**Vapi (verify if stale):** Web SDK `@vapi-ai/web` — browser uses public key, private key
server-side. `vapi.start(config, overrides)`; per-call context via
`assistantOverrides.variableValues` (nested). Custom tools POST to `server.url` <1s in-turn
(we avoid via pre-fetch). LLMs Anthropic/OpenAI/custom; STT Deepgram, TTS ElevenLabs; BYO
keys → $0 passthrough; $10 free credit. Timestamped transcript via `GET /call/{id}`.
LLM providers incl. **Groq** (`provider:"groq"`, `model:"llama-3.3-70b-versatile"`).

**Groq (verified 2026-06-20):** OpenAI-compatible at
`https://api.groq.com/openai/v1/chat/completions`. `llama-3.3-70b-versatile` measured
~170–240ms TTFB (streaming) — our live interviewer. `llama-3.1-8b-instant` ~140ms but
hallucinates facts → don't use for grounding.

**Gotchas:** _(append as discovered)_
- GLM (Z.ai) models are hybrid-reasoning: without `thinking:{type:"disabled"}` they spend the
  whole `max_tokens` budget on hidden `reasoning_content` and return empty `content`.
- Don't trust ANY live model's recall of company facts (Groq 70B included) — it invents
  acquirers/dates. Grounding via injected fact pack is load-bearing, not optional.
