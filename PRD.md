# Greenroom — Product Requirements Document

> A voice-native partner for high-stakes finance, grounded in real, cited data — it catches
> your bluffs when you practice, and briefs you with dense market intelligence when you're live.

**Event:** Megathon 2026 · **Build window:** ~1.5 days · **Sponsors targeted:** Cala.ai
(data moat) + Vapi (voice). This is the single source of truth — vision *and* buildable spec.

---

## 1. Problem

High-stakes conversations — IB interviews, sales calls, investor pitches, negotiations —
are won on two things: how you carry yourself, and whether you actually know the facts
about the company/person across the table. People rehearse in their head or with a friend
who knows nothing about the counterparty. Generic AI voice tools roleplay fluently but
**make up** the counterparty's details, so they miss the single most common failure mode:
confidently saying something false about a real company. In a real IB interview, bluffing
on a fact is exactly how you lose.

## 2. Solution

Pick a scenario and a **real** target (a company / deal / interviewer at a bank).
Greenroom places a live voice call where the AI plays the other side of the table,
grounded in **verified, cited facts** about that real target. It probes, objects, and
fact-checks you mid-conversation. After the call you get a transcript with every bluff
flagged and **sourced**.

**Hero use case — the IB / finance interview.** Greenroom runs a live mock interview by
voice. It handles the technical drills a generic LLM already knows, but its edge is the
**markets & company knowledge** that sinks candidates: "Pitch me a stock" → it pulls the
company's real profile (founders, owners, funders, recent activity) and grills you,
catching you when you're wrong:

- *"You said they're founder-led — their CEO isn't a founder. Are you sure?"*
- *"You pitched them as mid-market, but they're 5,000 employees. Walk me through that."*

## 3. Product critique & rationale (why this wins, and what could kill it)

**Agree with the core thesis.** The wedge is sharp and the differentiation is *structural*,
not cosmetic: generic voice tools hallucinate the counterparty; grounding in Cala's cited
data is something they cannot do. It's demoable live on a judge (everyone has sat a hard
interview), and it's load-bearing for **both** sponsor prizes in a single build.

**Risks and mitigations baked into this build:**

| Risk | Mitigation |
|---|---|
| Live fact-check latency + Cala's 10 req/min free-tier cap | **Pre-fetch a cited fact pack** before the call; Cala is hit ~1–3×/session, not per turn. |
| Scope creep (knowledge graph) eats the timebox | Graph is the **last** slice with a hard cut line → degrades to card view. |
| Voice demo fragility in a loud venue | Headset + push-to-talk + **recorded/mock fallback mode**. |
| "Catch the bluff" magic depends on fact-pack coverage | Curate **1–2 hand-picked demo companies** with rich Cala coverage; don't accept arbitrary input on stage. |
| Wispr Flow API is partnership-gated | **Dropped** as a dependency; used only as a dictation tool while coding. |

## 4. Users

- **Primary:** finance students / early-career candidates prepping for IB/PE/consulting
  interviews who fear the "pitch me a company" curveball.
- **Secondary (pitch only):** anyone rehearsing a fact-sensitive high-stakes conversation
  (sales, fundraising). The platform story; not built for the demo.

## 5. Scope

### In scope (the build)
- **Study mode** — explore a target firm as a cited fact pack + knowledge graph.
- **Spar mode** — live Vapi voice mock interview grounded in the fact pack.
- **Fact-check + Debrief** — post-call transcript with bluffs flagged and **sourced**, plus
  a simple score. *This is the differentiator — protect it.*
- **Presentation layer (M5 polish)** — Spar styled as a **"video call"** (static interviewer
  image + call chrome; audio-only browser call underneath) and a **faked Cal-style scheduling**
  screen (book a slot → "Join now" starts the call immediately).

### Optional / stretch (only after the core works)
- **Mollie test-mode paywall** (M6, the last step) — a Business/Distribution-score booster;
  the Mollie account already qualifies us for the Startup track regardless. See `TASKS.md`.

### Out of scope (pitch as "platform", don't build)
- Multiple verticals (sales, negotiation) beyond the IB interview.
- Arbitrary user-entered targets on stage (curated demo companies only).
- **Real video streams, phone calls / Twilio, and any real time-triggered scheduling backend.**
- Deep Mollie integration beyond a test-mode checkout.
- Auth, persistence beyond a JSON cache, multi-user, mobile-native.
- Wispr Flow API integration.

## 6. User stories

1. As a candidate, I pick "IB interview" and a target company, and see a cited fact pack so
   I know what I'm walking into. *(Study)*
2. As a candidate, I start a voice call and the interviewer asks me to pitch the company and
   challenges my claims out loud. *(Spar)*
3. When I state something false ("they're founder-led"), the interviewer pushes back, and
   after the call I see that exact quote flagged with the correct fact **and a source URL**.
   *(Fact-check / Debrief)*
4. As a candidate, I explore the company's relationships (owners, funders, board) as a graph
   where each edge links to its source. *(Study — graph, cut-able)*
5. As a candidate, I "book" my interview on a Cal-style scheduling screen and join a
   video-call-style session — realistic framing, even though the call starts on demand.
   *(Schedule → Spar; scheduling is faked, no real time-trigger)*

## 7. Success criteria

- **Demo:** end-to-end on a public URL — pick target → study cited facts → voice interview
  → intentionally bluff a known fact → see it flagged with a working source link in Debrief.
- **Both prizes legible:** Cala = the cited data; Vapi = the voice. Judges can name both.
- **Resilience:** runs from the recorded/mock fallback with the network off.

## 8. Tech stack (detailed)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One app: React UI for Vapi Web SDK + server routes hide keys. |
| Styling | **Tailwind CSS** + fluid `clamp()` root font, `rem` units | Per global responsive rules (Retina-safe sizing). |
| Voice | **Vapi Web SDK** `@vapi-ai/web` | Browser-mic agent, barge-in, live transcript. **Public** key in browser; private key server-side. |
| Interviewer LLM (live) | **Groq `llama-3.3-70b-versatile` via Vapi**, bring-your-own key | Chosen for latency: **~0.2s TTFB** (vs ~1.7s for GLM, ~0.7–1s for Claude Haiku) — measured streaming. $0 passthrough. **Grounded only** (relies on injected fact pack; never fact-checks live). Avoid `llama-3.1-8b-instant`: faster but hallucinates facts. Fallback: OpenAI gpt-4o-mini. |
| STT / TTS | **Deepgram** (nova) / **ElevenLabs** (`11labs`) | Vapi-managed defaults; pick a credible interviewer voice. |
| Grounded data | **Cala.ai REST** `https://api.cala.ai`, header `X-API-KEY` | Tools: `entity_search` → UUID, `retrieve_entity` → profile+relationships, `knowledge_search` → cited prose+entities. **Server-side only.** |
| Debrief LLM (post-call) | **Claude (Anthropic SDK)** or **GLM-5.2 (Z.ai)** | Latency doesn't matter here → use the stronger reasoner. Post-call: transcript + fact pack → structured `{flags, scores}`. This is where the "Claude" story lives now that the live turn is Groq. |
| Graph viz | **react-force-graph-2d** | Cited knowledge graph in Study mode; cut-able → card fallback. |
| Cache/state | In-memory + `data/factpacks/*.json` | Protects Cala credits; packs survive reloads. |
| Deploy | **Vercel** | Zero-config Next.js + serverless routes + public URL. |

**Cala.ai facts that constrain design** (from research): free tier = 100 credits/mo,
**10 req/min**; `knowledge_search` returns citations (`origins[].source.url`),
`knowledge_query` returns structured JSON (Cala QL, may lack per-row citations — prefer
`search` when sources matter). Console: `console.cala.ai`; docs: `docs.cala.ai`.

**Vapi facts that constrain design** (from research): Web SDK uses public key; custom
tools POST to your `server.url` **synchronously inside the turn** (keep <1s — we avoid this
via pre-fetch); supports Anthropic/OpenAI/**Groq** LLMs and bring-your-own keys ($0 passthrough);
$10 free signup credit; timestamped transcript via `GET /call/{id}`; per-call context via
`assistantOverrides.variableValues`. Docs: `docs.vapi.ai`.

**Env vars:** `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`,
`GROQ_API_KEY` (live interviewer), `ANTHROPIC_API_KEY` and/or `GLM_API_KEY` (debrief),
optional `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`) / `DEEPGRAM_API_KEY`.

## 9. Architecture

**Principle: grounding before the call, scoring after.** Live per-turn Cala lookups are
fragile (free tier = 10 req/min; Vapi tool calls must return <1s). Instead, pre-fetch a
cited fact pack and inject it into the interviewer prompt; do structured fact-checking in a
reliable post-call Claude pass.

**Three phases:**
1. **Pre-call:** `/api/factpack` queries Cala → normalized cited fact pack → cached JSON →
   injected into the Vapi interviewer's system prompt as ground truth.
2. **Live (Spar):** Vapi assistant (Groq `llama-3.3-70b-versatile`, ~0.2s TTFB) challenges
   claims against the **injected facts only** — it must not freelance corrections from its own
   memory (it demonstrably hallucinates them); live correction is out of scope, fact-checking
   is the debrief's job. Transcript captured via Web SDK `message` events.
3. **Post-call (Debrief):** `/api/call/[id]` pulls the timestamped transcript;
   `/api/debrief` runs Claude to compare statements vs fact pack → structured, sourced
   flags + score.

**Route / file map:**
```
app/page.tsx                  Landing: pick scenario (IB) + target
app/schedule/page.tsx         Schedule: faked Cal-style booking → "Join now" starts the call
app/study/[target]/page.tsx   Study: cited fact-pack cards + knowledge graph
app/spar/[target]/page.tsx    Spar: "video call" UI (interviewer image, mic, live transcript)
app/debrief/[callId]/page.tsx Debrief: transcript w/ sourced flags + score
app/api/factpack/route.ts     GET ?target= → Cala → normalized cited pack (cached)
app/api/call/[id]/route.ts    GET → proxy Vapi GET /call/{id} (timestamped transcript)
app/api/debrief/route.ts      POST {transcript,target} → Claude → {flags, scores}
lib/cala.ts                   Cala REST client (server-only; X-API-KEY)
lib/vapi-assistant.ts         Interviewer persona + fact-pack injection
lib/factpack.ts               Normalize Cala → FactPack; JSON cache
lib/anthropic.ts              Anthropic client for the debrief pass
data/factpacks/*.json         Cached fact packs (one per demo company)
scripts/test-cala.ts          M0 smoke test (entity_search + knowledge_search)
scripts/test-vapi.ts          M0 smoke test (boot a trivial web call)
```

**Core types:**
```ts
type Fact = { claim: string; value: string; sourceUrl: string; sourceName?: string };
type Relationship = { type: string; from: string; to: string; sourceUrl?: string };
type FactPack = { target: string; entityId: string; summary: string;
                  facts: Fact[]; relationships: Relationship[]; fetchedAt: string };
type FactCheckFlag = { quote: string; issue: string; correctValue: string;
                       sourceUrl: string; severity: "low" | "medium" | "high" };
```

**Fact-pack pipeline (pre-call):** target name → Cala `entity_search` (→ UUID) →
`retrieve_entity` (profile + relationships) + `knowledge_search` (cited facts) → normalize
(`facts[].sourceUrl` from `origins[].source.url`) → cache to `data/factpacks/<target>.json`.

**Keys:** `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `ANTHROPIC_API_KEY` are server-only; only
`NEXT_PUBLIC_VAPI_PUBLIC_KEY` reaches the browser. All Cala traffic goes via `/api/factpack`.

**Fallbacks:** thin Cala coverage → swap demo company; Vapi/network fail → mock mode
(canned pack + recorded call); Anthropic-in-Vapi finicky → switch interviewer to gpt-4o;
graph unfinished → Study keeps the card view.

## 10. Milestones

See `TASKS.md`. M0 de-risk both APIs → M1 fact pack → M2 voice loop → M3 fact-check+debrief
→ M4 graph (cut line) → M5 polish + demo hardening (incl. the "video call" skin + fake
scheduling) → M6 optional Mollie paywall (the last step). Each milestone is demo-able.

## 11. Demo narrative

Arc: "Here's the company (cited facts) → now interview me → watch me bluff → it catches me,
with the source." Curate 1–2 demo companies and script the bluffs in advance; keep a
mock/recorded fallback so a venue/network/voice failure can't kill the pitch.
