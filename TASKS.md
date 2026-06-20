# Greenroom — Task Board

Milestone-based, timeboxed for ~1.5 build days. Each milestone ends **demo-able** and has a
Definition of Done (DoD). Update statuses as you go: `[ ]` todo · `[~]` in progress ·
`[x]` done.

**Cut order if behind:** M6 Mollie paywall → M4 graph → M5 polish extras → keep M0–M3
sacred (M3 is the differentiator). **Mollie integration is the LAST step — only after the
whole product is built.** Log decisions/gotchas in the bottom of `CLAUDE.md`.

## Prerequisites (track eligibility)
- [x] **Mollie account created** — this alone qualifies us for the **Startup track** (the
      main €10K cash + €15K Codex prize). Mollie *integration is optional* and not required
      for the main prize.
- [ ] Cala, Vapi, Anthropic API keys in `.env.local` (see `CLAUDE.md` / `.env.example`).
- [ ] **Must ship a live URL by the Sunday deadline** (no deploy → no main prize) + post the
      Friday-night 60s video, repo link, and baseline metrics.

---

## M0 — Scaffold & de-risk (~2h) ⭐ do first
Prove both external APIs work *before* building any UI.
- [ ] `npx create-next-app@latest` (TS, App Router, Tailwind).
- [ ] `.env.local` with all keys; confirm `.env.example` documents them.
- [ ] `lib/cala.ts` minimal client (X-API-KEY).
- [ ] `scripts/test-cala.ts` — `entity_search` + `knowledge_search` on a demo company.
- [ ] **Inspect the *raw* Cala JSON before writing any normalizer** — dump the real
      `origins[].source` citation shape so `lib/factpack.ts` types match reality (first 30 min;
      skipping this = a 2h type-rewrite later).
- [ ] `scripts/test-vapi.ts` (or a throwaway page) — boot a trivial Vapi web call.
- [ ] **Test `GET /call/{id}` transcript shape now** — confirm you can split candidate vs.
      interviewer turns cleanly before M3 hands it to Claude (the format is messy).
- **DoD:** both scripts print real output (cited facts from Cala; a working voice hello from
  Vapi) **and** you've seen the real Cala citation JSON + the real Vapi transcript shape. If
  either fails, fix before anything else.

## M1 — Fact pack + Study showcase (~2.5h)
Study is the **optional Cala showcase** off Landing (judge-facing proof the data is real), not
a step the candidate must read before interviewing.
- [ ] `lib/factpack.ts` — normalize Cala output → `FactPack`; JSON cache read/write.
- [ ] `app/api/factpack/route.ts` — `GET ?target=` builds + caches the pack.
- [ ] Pick **1–2 demo companies** with rich Cala coverage; pre-build + commit their packs.
- [ ] **Find + verify the "stale-LLM catch"** — for the chosen company, lock at least one
      *recent, sourced* fact a generic LLM gets **wrong** (CEO change / buyout / new lead
      investor from the last weeks-to-months, not 6mo+ or GPT already knows it). Confirm the
      source URL resolves. **This is a deliverable, not a nice-to-have** — no catch, no Cala story.
- [ ] Ensure the pack carries **relationship facts** (owners/funders/board/comps), so the
      network can be interrogated and rendered as a cited list even if M4's graph is cut.
- [ ] `app/study/[target]/page.tsx` — `FactCard`s with `SourceChip`s.
- **DoD:** `/study/<target>` shows grouped cited facts; every source chip links out; the
  scripted stale-LLM catch is written down and its source verified to resolve.

## M2 — Spar voice loop (~3h)
- [ ] `lib/vapi-assistant.ts` — interviewer persona + inject fact pack into system prompt.
- [ ] `app/spar/[target]/page.tsx` — Vapi Web SDK; `MicButton` (push-to-talk); live
      transcript rail; start/stop.
- [ ] Per-call `assistantOverrides.variableValues` (candidate name, target).
- **DoD:** you can hold a voice mock interview; it asks you to pitch the company and
  references real facts; ending the call yields a `callId`.

## M3 — Fact-check + Debrief (~3h) ⭐ differentiator — protect
- [ ] `app/api/call/[id]/route.ts` — proxy Vapi `GET /call/{id}` (timestamped transcript).
- [ ] `lib/anthropic.ts` + `app/api/debrief/route.ts` — Claude compares transcript vs fact
      pack → **`DebriefResult`**: reconstruct *every* factual claim → `ClaimCheck[]`
      (`verified` | `flagged` | `unverifiable`, each with a source link) + `FactCheckFlag[]` +
      `verifiedCount`/`totalClaims` + score. **Citation density is the wow — not just the 1–2 bluffs.**
- [ ] `app/debrief/[callId]/page.tsx` — transcript with `FlagChip`s (quote · issue ·
      correctValue · source) + a **scorecard** ("N of M claims verified, every one linked") +
      `ScorePanel`.
- **DoD:** bluff a known fact in Spar → it appears flagged with a **working source link**;
  the scorecard shows the full verified-claims tally with a resolving link per claim.

## M4 — Knowledge graph (~2h) ✂️ CUT LINE
- [ ] `GraphView` with `react-force-graph-2d` from `FactPack.relationships`.
- [ ] Click edge/node → source.
- **DoD:** graph renders entity + relationships, sources reachable. *If behind schedule,
  skip entirely — Study keeps the M1 card view.*

## M5 — Polish + demo hardening (~2h)
- [ ] Apply `DESIGN.md` tokens/typography; fluid `clamp()` root font verified on a wide
      display.
- [ ] **"Video call" skin for Spar** — static interviewer image + call chrome
      (`InterviewerStage` + `CallBar`). Cosmetic only; audio stays the browser web call.
      No Twilio, no real video.
- [ ] **Fake scheduling flow (on the critical path)** — Cal-style booking screen
      (`BookingPicker` + `ConfirmationCard`) that "books" a slot then **starts the call
      immediately** via "Join now". No real time-triggered backend. *Timebox ~1–2h; it's
      cosmetic — don't let it eat M2/M3.*
- [ ] **Visible Cala moment** — a "Querying Cala.ai for [Company]'s entity network…" loading
      beat on "Join now" / Spar entry, so judges *see* Cala working (else it looks like a
      scraped JSON file). Cheap, high legibility for the sponsor prize.
- [ ] **Mock/fallback mode** — canned fact pack + recorded call + **a hardcoded, perfect
      precomputed `DebriefResult`** mapped to the recorded transcript, triggerable manually.
      If the live API hesitates for even a second during the demo, render the perfect Debrief
      instantly. Network-off safe.
- [ ] Deploy to Vercel; set env vars in the dashboard.
- [ ] Script the bluffs in advance and rehearse the demo end to end.
- **DoD:** full flow runs on the Vercel URL **and** the recorded fallback works offline.

### M6 (optional, LAST STEP) — Mollie paywall ✂️ cut freely
**Do this only after the whole product is built and working** — integrating Mollie is the
very last thing we touch. A Business/Distribution-score booster (judging: Business 15% +
Distribution 10%); also unlocks the Mollie bounty (€20K *processing-volume credit*, not
cash). The account already qualified us, so losing this costs nothing.
- [ ] **Mollie test-mode hosted checkout** as a paywall — e.g. *"first mock interview free →
      €9 for unlimited sessions."* Use the **Test API key** (`test_...` from Mollie Dashboard
      → Developers → API keys), or a no-code **Payment Link** if time is tight.
- [ ] `MOLLIE_API_KEY` server-side only; payment creation via an API route, never the client.
- **DoD:** clicking "Unlock" opens a Mollie hosted checkout and a test payment completes.

---

## Definition of Done (global)
A milestone is done only when: the tree still runs, the DoD scenario passes manually, and
any new decision/gotcha is recorded in the `CLAUDE.md` log. Commit at each milestone with a
conventional message (`feat:`, `fix:`, `chore:`).
