# Greenroom

> A voice-native partner for high-stakes finance, grounded in real, cited data — it catches
> your bluffs when you practice, and briefs you with dense market intelligence when you're live.

Hero use case: a live **voice mock IB/finance interview** where the AI interviewer is
grounded in **cited, real-company data** (via **Cala.ai**) and challenges you over voice
(via **Vapi**). After the call you get a transcript with every bluff **flagged and sourced**.

Built for **Megathon 2026** — targeting the Cala.ai and Vapi prizes.

## Docs

| File | What |
|---|---|
| `PRD.md` | Vision + buildable spec + architecture + detailed tech stack |
| `DESIGN.md` | Design system + UX flows |
| `TASKS.md` | Timeboxed milestone board |
| `CLAUDE.md` | Repo instructions for AI sessions |

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind · Vapi Web SDK (voice) · Cala.ai REST
(cited data) · Anthropic SDK (post-call fact-check) · react-force-graph (knowledge graph) ·
Vercel.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

### Required keys (`.env.local`)
```
CALA_API_KEY=...                     # console.cala.ai → API keys (server-only)
VAPI_PRIVATE_KEY=...                 # dashboard.vapi.ai (server-only)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=...      # dashboard.vapi.ai (browser-safe)
ANTHROPIC_API_KEY=...                # console.anthropic.com (server-only)
# optional if not using Vapi-managed providers:
ELEVENLABS_API_KEY=...
DEEPGRAM_API_KEY=...
# optional — only for the M5 Mollie paywall stretch (use the test_ key):
MOLLIE_API_KEY=test_...               # Mollie Dashboard → Developers → API keys
```

### De-risk first (do before building UI)
```bash
npx tsx scripts/test-cala.ts    # prints cited facts for a demo company
npx tsx scripts/test-vapi.ts    # boots a trivial voice call
```

## Flow

Landing (pick IB + target) → **Study** (cited fact pack + graph) → **Spar** (voice
interview) → **Debrief** (transcript with sourced bluff-flags + score).

## Architecture in one line

Pre-fetch a cited **fact pack** from Cala → inject as ground-truth into the Vapi
interviewer → after the call, a Claude pass compares your transcript to the fact pack and
emits **sourced fact-check flags**. (Grounding before the call, scoring after — avoids
Cala's rate limit and Vapi's per-turn latency budget.) See `PRD.md` §9.
