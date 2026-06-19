# Greenroom — Architecture

Companion to `PRD.md`. Describes the system, data flow, and route map. Stack: Next.js 15
(App Router) + TypeScript, Vapi Web SDK, Cala REST, Anthropic SDK, Vercel.

## 1. Design principle: grounding before the call, scoring after

The naive design — fact-check every spoken claim with a live Cala call inside the Vapi turn
— is fragile: Cala's free tier is **10 req/min** and Vapi tool calls must return in **<1s**
or the agent stalls. Instead:

- **Pre-fetch** a cited fact pack once per session and **inject it** into the interviewer's
  prompt. The LLM challenges bluffs against in-context verified facts — zero per-turn
  latency, minimal credit burn.
- **Decouple** structured fact-checking into a **post-call pass** (Claude compares the
  transcript to the fact pack). This is what produces the sourced flags + score, and it's
  reliable because it's not racing the conversation.

## 2. Component / route map

```
app/
  page.tsx                     Landing: pick scenario (IB) + target company
  study/[target]/page.tsx      Study: cited fact-pack cards + knowledge graph
  spar/[target]/page.tsx       Spar: Vapi call UI (start/stop, mic, live transcript)
  debrief/[callId]/page.tsx    Debrief: transcript w/ flagged, sourced fact-checks + score
  api/
    factpack/route.ts          GET ?target= → Cala queries → normalized cited pack (cached)
    call/[id]/route.ts         GET → proxy Vapi GET /call/{id} (timestamped transcript)
    debrief/route.ts           POST {transcript, target} → Claude → {flags, scores}
    vapi/webhook/route.ts      POST (optional) end-of-call-report; live Cala fallback tool
lib/
  cala.ts                      Cala REST client (server-only; X-API-KEY)
  vapi-assistant.ts            Build interviewer assistant config + inject fact pack
  factpack.ts                  Normalize Cala output → FactPack type; cache read/write
  anthropic.ts                 Anthropic SDK client for the debrief pass
data/factpacks/*.json          Cached fact packs (one per demo company)
scripts/
  test-cala.ts                 M0 smoke test: entity_search + knowledge_search
  test-vapi.ts                 M0 smoke test: minimal web call boot
```

## 3. Core types

```ts
type Fact = { claim: string; value: string; sourceUrl: string; sourceName?: string };
type Relationship = { type: string; from: string; to: string; sourceUrl?: string };
type FactPack = {
  target: string;
  entityId: string;
  summary: string;
  facts: Fact[];
  relationships: Relationship[];
  fetchedAt: string;
};
type FactCheckFlag = {
  quote: string;        // what the candidate said
  issue: string;        // why it's wrong
  correctValue: string; // grounded truth
  sourceUrl: string;
  severity: "low" | "medium" | "high";
};
```

## 4. Fact-pack pipeline (pre-call)

```
target name
  → Cala entity_search           → entityId (UUID)
  → Cala retrieve_entity(id)     → profile + relationships (owners, board, funders)
  → Cala knowledge_search(NL)    → cited facts (founders, headcount, recent activity)
  → normalize → FactPack (facts[].sourceUrl from origins[].source.url)
  → cache to data/factpacks/<target>.json
```

`knowledge_search` is preferred wherever sources matter because its response carries
`context[].origins[].source.{name,url}`. Cache aggressively — re-fetch only on demand.

## 5. Spar (live) lifecycle

```
Browser (/spar)                         Vapi cloud                    Providers
  vapi.start(assistantConfig) ───────►  STT (Deepgram)  ─►  LLM (Claude)  ─►  TTS (11labs)
   assistantConfig.model.messages[0] = interviewer persona + injected FactPack facts
  on('message' transcript) ◄─────────  streamed transcript + audio
  vapi.stop()  ───────────────────────► end of call → callId
```

The interviewer persona instructs: ask the candidate to pitch the company; when a claim
contradicts the injected facts, push back naturally and cite the real number. Per-call
values (candidate name, target) via `assistantOverrides.variableValues`.

## 6. Debrief (post-call) lifecycle

```
/debrief/[callId]
  → GET /api/call/[id]   → timestamped transcript (Vapi GET /call/{id}, private key)
  → POST /api/debrief {transcript, target}
       → load FactPack(target) from cache
       → Claude: "compare each candidate statement to these verified facts;
                  emit FactCheckFlag[] + scores"
  → render transcript with inline flags (quote, correctValue, source link) + score
```

## 7. Sequence (end to end)

```
User → Landing: choose IB + Target
     → /api/factpack(Target) → Cala → cached FactPack
Study: render facts + graph (sources clickable)
Spar:  vapi.start(persona + FactPack) → voice interview → vapi.stop() → callId
Debrief: /api/call/id (transcript) → /api/debrief (Claude vs FactPack) → flagged + scored
```

## 8. Security & keys

- `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `ANTHROPIC_API_KEY` are **server-only** (API routes,
  `lib/*`). Never imported into client components.
- Only `NEXT_PUBLIC_VAPI_PUBLIC_KEY` reaches the browser (Vapi's public key is safe there).
- All Cala traffic goes through `/api/factpack` (proxy) so the key never ships to the client.

## 9. Failure modes & fallbacks

- **Cala thin coverage for a target** → swap to a pre-verified demo company (curated in M1).
- **Vapi/network failure on stage** → mock mode: load a canned FactPack + play a recorded
  call + show a pre-computed Debrief (`DEMO.md`).
- **Anthropic path in Vapi finicky** → switch interviewer `model.provider` to OpenAI gpt-4o.
- **Graph not done** → Study renders the M1 card view; graph route hidden.
