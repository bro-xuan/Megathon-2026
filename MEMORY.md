# Greenroom — Project Memory / Decision Log

Append-only context for future Claude Code sessions and teammates. Record **decisions,
gotchas, and API quirks** as you discover them — not code structure (that's in the repo) or
generic facts. Newest at top within each section.

## Locked decisions (2026-06-19)

- **Product = Greenroom**: voice mock-interviewer grounded in cited real-company data. Hero
  use case = IB/finance interview. See `PRODUCT.md` (vision) and `PRD.md` (spec).
- **Sponsors that are load-bearing:** Cala.ai (cited data moat) + Vapi (voice). Targeting
  both prizes in one build.
- **Wispr Flow: dropped as a dependency.** Its dev API is partnership-gated
  (`enterprise@wisprflow.ai`, no self-serve, no hackathon track). It's a STT/dictation tool,
  not voice-agent infra. Use the desktop app to dictate while coding only.
- **Fact-check architecture = pre-fetch a cited fact pack** before the call, inject into the
  interviewer prompt; do **structured fact-checking in a post-call Claude pass**. Chosen
  over live mid-call Cala lookups because Cala free tier is 10 req/min and Vapi tool calls
  must return <1s — live per-turn checks would stall the demo.
- **Scope:** Full — Spar (voice) + Fact-check + Study knowledge graph. **Graph is the cut
  line** (M4) → degrades to card view.
- **Stack:** Next.js 15 + TS + Tailwind, Vapi Web SDK, Claude interviewer via Vapi,
  Anthropic SDK for debrief, react-force-graph for the graph, Vercel deploy.
- **Curate the demo:** 1–2 hand-picked companies with rich Cala coverage; do not accept
  arbitrary targets on stage.

## API quirks & facts (from research, 2026-06-19 — verify if stale)

### Cala.ai
- Base `https://api.cala.ai`; auth header `X-API-KEY`. Console `console.cala.ai`; docs
  `docs.cala.ai` (machine index `docs.cala.ai/llms.txt`).
- Tools/endpoints: `knowledge_search` (`POST /v1/knowledge/search`, **cited** prose +
  entities), `knowledge_query` (`POST /v1/knowledge/query`, Cala QL → JSON, may lack per-row
  citations), `entity_search` (`POST /v1/entities` → UUID), `retrieve_entity`
  (`POST /v1/entities/{id}` → profile + relationships), `entity_introspection`.
- Citations live in `knowledge_search` response: `context[].origins[].source.{name,url}`.
  **Prefer `knowledge_search` wherever sources matter.**
- Free tier: **100 credits/mo, 10 req/min**, no credit card. 429 on rate limit, 422 on
  validation. → **cache fact packs aggressively.**
- Has an MCP server at `https://api.cala.ai/mcp/` (X-API-KEY header) — we use REST in-app,
  but MCP is handy for exploring data during dev.
- **Unverified:** data freshness cadence (undocumented); whether `knowledge_query` returns
  citations. Verify empirically in M1.

### Vapi
- Web SDK `@vapi-ai/web`: browser uses **public** key; private key server-side only.
- `vapi.start(assistantConfig | assistantId, assistantOverrides)`. Per-call dynamic context
  via `assistantOverrides.variableValues` (must be nested, not top-level). Can inject
  mid-call system messages via `vapi.send({type:'add-message',...})`.
- Custom tools POST to `server.url` **synchronously inside the turn (<1s budget)** — we
  avoid this via pre-fetch; only relevant if a live-fallback tool is added.
- LLMs: Anthropic (Claude) + OpenAI + custom OpenAI-compatible. STT Deepgram (nova),
  TTS ElevenLabs (`11labs`). Bring-your-own keys → $0 provider passthrough; base $0.05/min;
  $10 free signup credit.
- Transcript: live `message` events lack per-utterance timestamps → pull final
  **`GET /call/{id}`** for timestamped `messages[]`. End-of-call: `end-of-call-report`
  server event.
- **Unverified:** exact free-minute count (varies by config); any active 2026 hackathon
  credit — ask organizers.

## Open questions to resolve during build
- Which Anthropic model id for the Vapi interviewer (latency vs quality) — decide in M2.
- Is Cala coverage rich enough for the chosen demo companies? — verify in M1, swap if thin.

## Gotchas log (add as discovered)
- _(empty — append here)_
