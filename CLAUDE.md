# CLAUDE.md — Greenroom

**Greenroom** — voice mock-interviewer grounded in **cited real-company data**; catches you
when you bluff a fact. Megathon 2026 hackathon, targeting **Cala.ai** + **Vapi** prizes.
Also read `PRD.md` (what/why), `DESIGN.md` (UI), `TASKS.md` (next). Log new decisions/quirks
at the bottom.

## Golden rules
1. **Grounding before the call, scoring after.** Pre-fetch a cited fact pack → inject into the
   Vapi prompt. NEVER fact-check live per turn (Cala 10 req/min). Structured fact-checks come
   from the **post-call debrief pass**.
2. **Don't trust any live model's recall of company facts** (Groq 70B included — it invents
   acquirers/dates). The injected fact pack is load-bearing, not optional.
3. **Protect the debrief** (fact-check + scorecard) — it's the differentiator. Study graph is
   the cut line.
4. **Curate the demo** — 1–2 companies with rich Cala coverage; no arbitrary input on stage.
   Keep `?mock=1` fallback (canned pack + recorded call) working so a venue failure can't kill it.
5. **Keys server-only** except `NEXT_PUBLIC_VAPI_PUBLIC_KEY`. All Cala traffic via `/api/factpack`;
   cache packs to `data/factpacks/*.json` (100-credit free tier).
6. Don't touch Mollie (paywall) until the product fully works — it's the last step.

## Conventions
- Next.js (App Router) + TS + Tailwind v4. UI in `app/`, server logic in `lib/` + `app/api/`.
  Newer than training data → read bundled docs at `node_modules/next/dist/docs/` before new APIs.
- **CSS:** fluid responsive only — `html { font-size: clamp(16px,1.15vw,24px) }`, `rem` units,
  `min(90%, …)` widths. No fixed `px` font sizes.
- Conventional commits; commit per milestone. Work on `main`; branch only for risky spikes.
- Deploy: push `main` → Vercel (env vars in dashboard). Dev: `npm run dev`.

## Architecture
- **Interview keyed on TRACK, not company** (`lib/tracks.ts`). Two **grounded** tracks
  (`stock-pitch`, `markets`) are the hero (Cala load-bearing). Two **ungrounded** tracks
  (`behavioral`, `technical`) are table-stakes, shown secondary.
- **Companies (Stripe/OpenAI) are PREP MATERIAL**, not targets. Grounded tracks merge the whole
  prep library (`PREP_TARGETS`, both packs → 19 cited facts); candidate picks what to pitch.
  `/study/[target]` = "Prep material: X".
- **Live interviewer = Groq `llama-3.3-70b-versatile`** via Vapi BYO (~0.2s TTFB), grounded-only.
- **Debrief = GLM-5.2** (pinned via `DEBRIEF_PROVIDER=glm`; Claude path exists if key set).
  `/api/debrief {track,transcript}` routes grounded→cited M3 scorecard vs ungrounded→
  `buildGeneralDebrief`. `mock-stripe` is the insurance/sample path.
- Routes: `/spar/[track]`, `/api/assistant?track=`, `/api/debrief`.

## Env vars (`.env` is permission-locked — edit by hand)
Server: `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `GROQ_API_KEY`, `GLM_API_KEY` (and/or
`ANTHROPIC_API_KEY`), `DEBRIEF_PROVIDER=glm`. Optional: `ELEVENLABS_API_KEY`(+`_VOICE_ID`)/
`VAPI_USE_ELEVENLABS=1`, `DEEPGRAM_API_KEY`, `MOLLIE_API_KEY` (test). Client:
`NEXT_PUBLIC_VAPI_PUBLIC_KEY`.

## API facts (verified 2026-06-20)
**Cala** — base `https://api.cala.ai`, header `X-API-KEY`. 100 credits/mo, 10 req/min (429).
- `knowledge_search` is the **primary + sufficient** source: `POST /v1/knowledge/search`
  body **`{ input: string }`** (NOT `query`). Returns `{ content, explainability[], context[],
  entities[] }`. `content` = grounded dated markdown (inject this); citations at
  **`context[].origins[].source.{name,url}`**; `explainability[]` = `{content, references:[ctx.id]}`
  claim→source map; `entities[]` = related-entity network.
- Over-long compound queries return a degenerate `"too complex…"` summary + 0 facts.
  `buildFactPack` falls back to simpler queries (`searchInputs()`/`isDegenerate`) — keep this.
- `entity_search` = **`GET /v1/entities?name=`** (NOT POST) → multiple/sparse matches, pick by
  richness. `retrieve_entity` (`POST /v1/entities/{uuid}` body `{}`) returns **empty
  relationships** — don't rely on it; relationships live in `knowledge_search`.

**Vapi** — Web SDK `@vapi-ai/web` (browser=public key, private=server). `vapi.start(config,
overrides)`; per-call context via `assistantOverrides.variableValues`. BYO keys → $0. Transcript
via `GET /call/{id}`. Groq provider credential registered (`POST /credential`). **ElevenLabs key
is 401/invalid** → voice falls back to Vapi default unless `VAPI_USE_ELEVENLABS=1` + valid key.

**Groq** — OpenAI-compatible `https://api.groq.com/openai/v1`. `llama-3.3-70b-versatile`
~170–240ms TTFB. `llama-3.1-8b-instant` faster but hallucinates → don't use for grounding.

**GLM (Z.ai)** — endpoint `https://api.z.ai/api/coding/paas/v4` (OpenAI-compatible), up to
`glm-5.2`. Hybrid-reasoning → MUST pass `thinking:{type:"disabled"}` or `content` comes back empty.
Helper: `node scripts/glm-review.mjs <file>`.

## Status
Build clean. Pending: real browser+mic WebRTC voice call, Vercel deploy.

## Decision log (append newest on top)
_Older verified facts folded into the sections above. Add only genuinely new decisions/quirks here._
