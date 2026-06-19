# Greenroom — Demo Script & Fallback Plan

A live voice demo in a loud venue with flaky wifi is the single biggest demo risk. This doc
is the ~3-minute script **and** the insurance policy. Rehearse both.

## The arc (one sentence)

"Here's a real company with cited facts → now interview me about it → watch me bluff → it
catches me, and shows the source."

## 3-minute live script

1. **Hook (20s).** "The fastest way to fail an IB interview is to confidently say something
   false about a real company. Generic AI interviewers can't catch that — they make the
   company up. Greenroom doesn't." Land on the Landing screen.
2. **Study — the moat (30s).** Open `/study/<DemoCompany>`. "These aren't hallucinated —
   every fact is pulled from **Cala** and **cited**." Click one source chip to prove it
   opens a real source.
3. **Spar — the voice (60s).** "Go on stage." Start the call. Interviewer (Vapi):
   *"Pitch me [DemoCompany]."* Give a real pitch — **then deliberately bluff one prepared
   fact** (e.g. call it founder-led when the CEO isn't a founder). The interviewer pushes
   back out loud: *"Their CEO isn't a founder — are you sure?"* This is the magic moment.
4. **Debrief — the payoff (40s).** End the call. Debrief shows the transcript with the bluff
   **flagged, corrected, and sourced**, plus a score. "Every bluff, caught and cited."
5. **Close (10s).** "Cala is the moat — real cited data. Vapi is the product — it's a
   conversation. Practice any high-stakes conversation that turns on real facts."

## Prepared bluffs (script these — don't improvise on stage)

Pick 2 from the demo company's fact pack and rehearse saying them wrong:
- Ownership/founder status (founder-led vs not).
- Headcount / size tier (mid-market vs enterprise).
- A recent funding round or deal detail.

Each must exist in the cached fact pack with a clean source URL so the catch is guaranteed.

## Pre-flight checklist (run 15 min before)

- [ ] Headset/mic tested in the actual room; push-to-talk works.
- [ ] Vercel URL loads; env vars set.
- [ ] Demo company fact pack present in `data/factpacks/` and loads.
- [ ] One full dry run of the bluff → catch → debrief.
- [ ] Phone hotspot ready as wifi backup.
- [ ] Recorded fallback video queued (below).

## Fallback ladder (most → least live)

1. **Live on Vercel** — primary.
2. **Live on localhost + hotspot** — if Vercel/wifi flaky.
3. **Mock mode** — `?mock=1` loads a canned `FactPack`, plays a **recorded call audio**, and
   renders a **precomputed Debrief** from a committed fixture. No network needed. Build this
   in M5.
4. **Recorded screen-capture video** — a clean 2-min run captured beforehand. Last resort;
   always have it on the laptop, not just the cloud.

## Mock mode implementation note (M5)

- Commit `data/factpacks/<demo>.json` and `data/debrief/<demo>.json` fixtures.
- Gate on `?mock=1`: Study/Debrief read fixtures; Spar plays a bundled audio file instead of
  calling Vapi. Keep it a thin branch so it can't rot the real path.
