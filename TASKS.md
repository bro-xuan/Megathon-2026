# Greenroom — Task Board

Milestone-based, timeboxed for ~1.5 build days. Each milestone ends **demo-able** and has a
Definition of Done (DoD). Update statuses as you go: `[ ]` todo · `[~]` in progress ·
`[x]` done.

**Cut order if behind:** M4 graph → M5 polish extras → keep M0–M3 sacred (M3 is the
differentiator). Log decisions/gotchas in the bottom of `CLAUDE.md`.

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
- [ ] `scripts/test-vapi.ts` (or a throwaway page) — boot a trivial Vapi web call.
- **DoD:** both scripts print real output (cited facts from Cala; a working voice hello from
  Vapi). If either fails, fix before anything else.

## M1 — Fact pack + Study cards (~2.5h)
- [ ] `lib/factpack.ts` — normalize Cala output → `FactPack`; JSON cache read/write.
- [ ] `app/api/factpack/route.ts` — `GET ?target=` builds + caches the pack.
- [ ] Pick **1–2 demo companies** with rich Cala coverage; pre-build + commit their packs.
- [ ] `app/study/[target]/page.tsx` — `FactCard`s with `SourceChip`s.
- **DoD:** `/study/<target>` shows grouped cited facts; every source chip links out.

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
      pack → `FactCheckFlag[]` + scores.
- [ ] `app/debrief/[callId]/page.tsx` — transcript with `FlagChip`s (quote · issue ·
      correctValue · source) + `ScorePanel`.
- **DoD:** bluff a known fact in Spar → it appears flagged with a **working source link** in
  Debrief.

## M4 — Knowledge graph (~2h) ✂️ CUT LINE
- [ ] `GraphView` with `react-force-graph-2d` from `FactPack.relationships`.
- [ ] Click edge/node → source.
- **DoD:** graph renders entity + relationships, sources reachable. *If behind schedule,
  skip entirely — Study keeps the M1 card view.*

## M5 — Polish + demo hardening (~2h)
- [ ] Apply `DESIGN.md` tokens/typography; fluid `clamp()` root font verified on a wide
      display.
- [ ] **Mock/fallback mode** — canned fact pack + recorded call + precomputed Debrief
      (network-off safe) so a venue/network failure can't kill the demo.
- [ ] Deploy to Vercel; set env vars in the dashboard.
- [ ] Script the bluffs in advance and rehearse the demo end to end.
- **DoD:** full flow runs on the Vercel URL **and** the recorded fallback works offline.

### M5 (optional) — Mollie paywall ✂️ cut freely
Only if M0–M3 are solid. A Business/Distribution-score booster (judging: Business 15% +
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
