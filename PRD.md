# Greenroom — Product Requirements Document

> A voice-based practice partner for high-stakes conversations that knows the real
> facts — so when you bluff, it catches you, exactly like real life.

**Event:** Megathon 2026 · **Build window:** ~1.5 days · **Sponsors targeted:** Cala.ai
(data moat) + Vapi (voice). See `PRODUCT.md` for the original vision; this PRD is the
buildable spec.

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
catching you when you're wrong.

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
| Voice demo fragility in a loud venue | Headset + push-to-talk + **recorded/mock fallback mode** (`DEMO.md`). |
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

### Out of scope (pitch as "platform", don't build)
- Multiple verticals (sales, negotiation) beyond the IB interview.
- Arbitrary user-entered targets on stage (curated demo companies only).
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
| Interviewer LLM | **Claude (Anthropic) via Vapi**, bring-your-own key | Strong instruction-following; $0 provider passthrough. Fallback: OpenAI gpt-4o if the Anthropic path is finicky. |
| STT / TTS | **Deepgram** (nova) / **ElevenLabs** (`11labs`) | Vapi-managed defaults; pick a credible interviewer voice. |
| Grounded data | **Cala.ai REST** `https://api.cala.ai`, header `X-API-KEY` | Tools: `entity_search` → UUID, `retrieve_entity` → profile+relationships, `knowledge_search` → cited prose+entities. **Server-side only.** |
| Debrief pass | **Anthropic SDK** `@anthropic-ai/sdk` | Post-call: transcript + fact pack → structured `{flags, scores}`. |
| Graph viz | **react-force-graph-2d** | Cited knowledge graph in Study mode; cut-able → card fallback. |
| Cache/state | In-memory + `data/factpacks/*.json` | Protects Cala credits; packs survive reloads. |
| Deploy | **Vercel** | Zero-config Next.js + serverless routes + public URL. |

**Cala.ai facts that constrain design** (from research): free tier = 100 credits/mo,
**10 req/min**; `knowledge_search` returns citations (`origins[].source.url`),
`knowledge_query` returns structured JSON (Cala QL, may lack per-row citations — prefer
`search` when sources matter). Console: `console.cala.ai`; docs: `docs.cala.ai`.

**Vapi facts that constrain design** (from research): Web SDK uses public key; custom
tools POST to your `server.url` **synchronously inside the turn** (keep <1s — we avoid this
via pre-fetch); supports Anthropic/OpenAI LLMs and bring-your-own keys ($0 passthrough);
$10 free signup credit; timestamped transcript via `GET /call/{id}`; per-call context via
`assistantOverrides.variableValues`. Docs: `docs.vapi.ai`.

**Env vars:** `CALA_API_KEY`, `VAPI_PRIVATE_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`,
`ANTHROPIC_API_KEY`, optional `ELEVENLABS_API_KEY` / `DEEPGRAM_API_KEY`.

## 9. Architecture summary

See `ARCHITECTURE.md` for detail. Three phases:
1. **Pre-call:** `/api/factpack` queries Cala → normalized cited fact pack → cached JSON →
   injected into the Vapi interviewer's system prompt as ground truth.
2. **Live (Spar):** Vapi assistant challenges claims against injected facts; transcript
   captured via Web SDK events.
3. **Post-call (Debrief):** `/api/call/[id]` pulls timestamped transcript; `/api/debrief`
   runs Claude to compare statements vs fact pack → structured, sourced flags + score.

## 10. Milestones

See `TASKS.md`. M0 de-risk both APIs → M1 fact pack → M2 voice loop → M3 fact-check+debrief
→ M4 graph (cut line) → M5 polish + demo hardening. Each milestone is demo-able.

## 11. Demo narrative

See `DEMO.md` for the 3-minute script + fallback plan. Arc: "Here's the company (cited
facts) → now interview me → watch me bluff → it catches me, with the source."
