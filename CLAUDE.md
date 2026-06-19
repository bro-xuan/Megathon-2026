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
Server-only: `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `ANTHROPIC_API_KEY`,
optional `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY`,
optional `MOLLIE_API_KEY` (test key, only for the M5 paywall stretch).
Client: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.

## Don't
- Don't depend on Wispr Flow's API (partnership-gated; dropped).
- Don't query Cala on every conversational turn.
- Don't ship secret keys to the browser.
- Don't let the graph (M4) jeopardize M0–M3.

## Decision log & API quirks (append newest at top)

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

**Gotchas:** _(append as discovered)_
