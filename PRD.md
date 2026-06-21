# Greenroom — Product Requirements Document

> A voice-native room to practice **any hard conversation** out loud, against someone who
> pushes back. Grounded in cited sources where facts matter, scored when you're done, so you
> walk in ready. (Catching bluffs is one capability, the cited moat, not the whole goal.)

**Event:** Megathon 2026 · **Build window:** ~1.5 days · **Sponsors targeted:** Cala.ai
(data moat) + Vapi (voice). This is the single source of truth — vision *and* buildable spec.

---

## 0. Framing: simulate any hard conversation (vision broad, demo narrow)

Greenroom is the room where you practice the conversations that are hard to face alone: a
job interview, an investor pitch, asking for a raise, breaking bad news. You pick the kind of
conversation; a voice agent plays the person across the table; afterward you get a debrief.
**Mock interview is one category, not the product** — that framing was crowded and undersold
what we built.

The product splits into **two tiers**, and the split is the whole strategy:

- **Grounded conversations (the moat — Cala load-bearing).** Where the other side can *call
  your bluff on a fact*: interviews, investor pitches, fact-backed negotiation. The agent is
  grounded in **verified, cited data**, and the debrief flags every claim you faked, **sourced**.
  Nobody else's voice sim has a ground-truth layer. This is what wins the Cala prize.
- **Relational conversations (table stakes — range).** Where there's no fact to check: break-ups,
  hard feedback, letting someone go. The agent pushes back emotionally; the debrief coaches
  delivery (the `buildGeneralDebrief` path). Any LLM can run these — they prove the breadth, they
  are **not** the demo.

**The demo runs one grounded category end to end (the IB interview). The menu sells the rest.**
The picker shows the breadth — most tiles are honest "coming soon," not vaporware — because the
architecture (keyed on track + a `grounded` flag, not on a hard-coded scenario) makes adding a
category a config entry, not a rebuild. Sections 1–11 below specify that one hero category in full.

## 1. Problem

High-stakes conversations — interviews, investor pitches, negotiations, the personal talks you
dread — are won on two things: how you carry yourself, and (where it applies) whether you
actually know the facts about the company/person across the table. People rehearse in their head
or with a friend who can't push back convincingly. Generic AI voice tools roleplay fluently but,
in the conversations where facts matter, **make up** the counterparty's details — so they miss the
single most common failure mode: confidently saying something false about a real company. In a
real IB interview, bluffing on a fact is exactly how you lose.

## 2. Solution

Pick a kind of hard conversation. For the **grounded** categories you also pick a **real** target
(a company / deal / interviewer). Greenroom places a live voice call where the AI plays the other
side of the table — for grounded categories, grounded in **verified, cited facts** about that real
target. It probes, objects, and fact-checks you mid-conversation. After the call you get a
transcript with every bluff flagged and **sourced** (grounded) or a delivery-and-structure debrief
(relational).

**Hero use case — the IB / finance interview.** Greenroom runs a live mock interview by
voice. It handles the technical drills a generic LLM already knows, but its edge is the
**markets & company knowledge** that sinks candidates: "Pitch me a stock" → it pulls the
company's real profile (founders, owners, funders, recent activity) and grills you,
catching you when you're wrong:

- *"You said they're founder-led — their CEO isn't a founder. Are you sure?"*
- *"You pitched them as mid-market, but they're 5,000 employees. Walk me through that."*

**Where Cala becomes load-bearing (not garnish).** A plain LLM nails the technical drills, so
we deliberately steer the interview toward the three things only Cala can do, and make them the
*climax*:

1. **The "stale-LLM catch."** We script at least one fact that *sounds right and a generic LLM
   would agree with*, but Cala — with a recent, dated source — proves is outdated/false (a
   recent acquisition, a CEO change, a new lead investor). The candidate says the "obvious"
   thing; Greenroom catches it with a source link. **This one beat *is* the Cala prize**: it
   visibly beats what GPT-alone would have said. *(Curated demo requirement, see §11.)*
2. **Interrogate the network, not just the company.** The interviewer probes the *web of
   relationships* — comps, likely acquirers, funders, board — which is exactly Cala's
   entity-relationship data and the thing an LLM cannot reproduce reliably. Note the split:
   the **relationship _data_ is load-bearing** (it lives in the fact pack and renders fine as a
   cited list), while the **force-graph _visualization_ (M4) stays the cut line** — pretty, not
   essential. Its primary home is the **scored debrief graph** (§9 post-call): the same network,
   colored 🟢 verified / 🔴 bluffed / ⚪️ unexplored by what happened in the call — a memorable
   closer layered on top of the guaranteed claim list, never replacing it.
3. **(Flourish) Ground the interviewer too.** Where time allows, the interviewer persona is a
   *real* bank instantiated from Cala (e.g. "an MD at [real bank] that just closed [real
   deal]"), so Cala powers both sides of the table.

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

- **Primary (the demo):** finance students / early-career candidates prepping for IB/PE/consulting
  interviews who fear the "pitch me a company" curveball.
- **Secondary (the vision — shown as coming-soon, not built):** anyone rehearsing a hard
  conversation — founders prepping an investor pitch, anyone asking for a raise, anyone facing a
  break-up or hard feedback they keep putting off. The grounded categories share the demo's
  cited-fact engine; the relational ones share the voice agent and the general debrief.

## 5. Scope

### Main flow (the critical path — this is the demo)
```
Landing ──► Schedule ──► Spar ──► Debrief
(pick IB +   (fake Cal     (voice       (bluffs flagged
 company)     booking →     interview,    + sourced + score)
              "Join now")   video-call
                            skin)
```

### In scope (the build)
- **Spar mode** — live Vapi voice mock interview grounded in the pre-fetched fact pack.
  On the critical path.
- **Fact-check + Debrief** — post-call transcript with bluffs flagged and **sourced**, plus
  a simple score. *This is the differentiator — protect it.* On the critical path. The
  **scored debrief graph** (🟢/🔴/⚪️ over the relationship network, §9) is the hero visual
  layered on top of this — pure upside, cut-able to the claim list.
- **Schedule** — a **faked Cal-style scheduling** screen (book a slot → "Join now" starts the
  call immediately) that frames Spar as a real interview ritual. On the critical path.
- **Study mode** — **optional, off the critical path.** A judge-facing **Cala showcase**: a few
  credible cited fact cards with source links front-and-center, reachable from Landing
  ("see what we know about this company"). The candidate does **not** need to read it to
  interview — its job is to make the Cala data *visible and provably real*. The knowledge-graph
  visualization (M4) is pure upside; its primary payoff is the **scored debrief graph** (§9),
  with Study mode an optional second home for the same component.
- **Visible Cala moment** — because the pack is pre-fetched into JSON, Cala is otherwise
  *invisible* and judges may assume we scraped the web. Surface a deliberate, visible
  **"Querying Cala.ai for [Company]'s entity network…"** beat (on Schedule "Join" / Spar entry)
  so the sponsor's work is legible on screen, not just in a backend file.
- **Presentation layer (M5 polish)** — Spar styled as a **"video call"** (static interviewer
  image + call chrome; audio-only browser call underneath).

### Optional / stretch (only after the core works)
- **Mollie test-mode paywall** (M6, the last step) — a Business/Distribution-score booster;
  the Mollie account already qualifies us for the Startup track regardless. See `TASKS.md`.

### Roadmap (pitch as "the vision", show as coming-soon tiles, don't build for the demo)
- **Other conversation categories** — investor pitch and fact-backed negotiation (grounded, reuse
  the cited engine); break-ups, hard feedback, letting someone go (relational, reuse the voice
  agent + general debrief). These are **config entries** behind a `grounded` flag
  (`CONVERSATION_CATEGORIES` in `lib/tracks.ts`), surfaced as honest "coming soon" tiles on the
  picker so the breadth is legible without faking depth. Build **one** grounded category for the demo.
- **Other interview fields** within the live category — sales / consulting / med school (the
  `DOMAINS` roadmap), same coming-soon treatment.

### Out of scope (don't build, don't pitch)
- **Live co-pilot / "brief you while you're live."** Greenroom is a *mock* / rehearsal tool only.
  There is **no real-time Cala lookup during a call** — that contradicts the core architecture
  (grounding before, scoring after) and is a different product with no shared code.
- Arbitrary user-entered targets on stage (curated demo companies only).
- **Real video streams, phone calls / Twilio, and any real time-triggered scheduling backend.**
- Deep Mollie integration beyond a test-mode checkout.
- Auth, persistence beyond a JSON cache, multi-user, mobile-native.
- Wispr Flow API integration.

## 6. User stories

1. As a candidate, I pick "IB interview" and a target company, then "book" my interview on a
   Cal-style scheduling screen and join a video-call-style session — realistic framing, even
   though the call starts on demand. *(Landing → Schedule → Spar; scheduling is faked)*
2. As a candidate, I start the voice call and the interviewer asks me to pitch the company and
   challenges my claims out loud. *(Spar)*
3. When I state something false ("they're founder-led"), the interviewer pushes back, and
   after the call I see that exact quote flagged with the correct fact **and a source URL**.
   *(Fact-check / Debrief — the differentiator)*
4. As a judge/curious user, I open the optional Study screen and see the company's cited facts
   — proving the data Greenroom grounds on is real and sourced. *(Study — Cala showcase)*
5. As a candidate, after the call I see the company's relationship network as a graph where
   each node is colored by how I handled it — 🟢 verified, 🔴 bluffed (links to the source),
   ⚪️ never explored — so I can see both what I got wrong *and* what I never thought to probe.
   *(Debrief — scored graph, the hero visual; pure upside / cut-able to the claim list)*

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
   claims **against the injected facts only**. The boundary is precise: the agent **may push
   back live when a claim contradicts an injected fact** (that's grounded — the correct value
   is right there in the pack, so the scripted bluff *must* be a fact the pack contains); what
   it must **never** do is correct you from its own memory (it demonstrably hallucinates those)
   or attempt comprehensive fact-checking — that exhaustive, structured pass is the debrief's
   job. The persona is steered to **probe the relationship network** (comps, acquirers, funders,
   board) — the part of the pack only Cala can supply — not just generic technical drills.
   Transcript captured via Web SDK `message` events.
3. **Post-call (Debrief):** `/api/call/[id]` pulls the timestamped transcript;
   `/api/debrief` runs Claude to compare statements vs fact pack → a **citation-dense
   scorecard**: it reconstructs *every* factual claim the candidate made and reports
   "*N of M claims verified against source*" with a working link per claim, plus the flagged
   bluffs. The wall of working citations is the Cala wow — density, not just presence.

   **The scored debrief graph (the hero visual, layered on the same `DebriefResult`).** Render
   the fact-pack relationship network as a graph, colored by what happened in the call:
   🟢 **green** = discussed and verified, 🔴 **red** = bluffed (the flagged claim — pulses,
   links to the dated source), ⚪️ **grey** = never explored. The grey is a *coverage* insight
   no other tool gives ("you never probed their likely acquirer or board"), not just a
   correctness one. The mapping claim→node is **model-emitted** (`ClaimCheck.entityId`), not a
   brittle post-match. **It sits on top of the claim list, never replacing it:** the list is the
   undeniable receipts (judges can't read 15 source URLs off a node cloud), the graph is the
   memorable closer — click a red node → scroll to that flagged claim + source. If the graph
   isn't done by demo time, the full sourced scorecard still stands (it stays layered upside,
   the cut line holds — see §5).

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
// Citation-dense scorecard: every claim the candidate made, checked against the pack.
// `entityId` is emitted BY the debrief LLM (not post-matched) so each claim maps cleanly
// onto a fact-pack node → powers the colored debrief graph (see §9 post-call).
type ClaimCheck = { quote: string; verdict: "verified" | "flagged" | "unverifiable";
                    sourceUrl?: string; correctValue?: string; entityId?: string };
type DebriefResult = { claims: ClaimCheck[]; flags: FactCheckFlag[];
                       verifiedCount: number; totalClaims: number; score: number };
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

**The one beat that must land — the "stale-LLM catch."** Curate the demo company so that at
least one scripted bluff is something *a generic LLM would confidently agree with* but Cala
proves wrong with a recent, dated source (a recent acquisition, CEO change, new lead investor).
Rehearse it: candidate states the "obvious" fact → interviewer pushes back → Debrief shows the
exact quote flagged with a working source link. This is the moment that proves Cala beats
GPT-alone — without it, the Cala prize is just "company facts." Pick the company *for* this beat,
then verify the source URL resolves before the demo.

**Close on citation density.** End the demo on the Debrief scorecard — "N of M claims verified,
every one linked" — so the last thing judges see is a wall of working Cala citations.
