# Greenroom — Demo Script & Locked Catches

Curated demo targets (SPIKE, 2026-06-20). Packs cached + committed in `data/factpacks/`.
The whole pitch rests on the **stale-LLM catch**: a recent, dated fact an early-2025-cutoff
LLM gets wrong, which Cala proves with a deep-linked source.

## Primary — Stripe  (`data/factpacks/stripe.json`)
- 10 cited facts · 58 relationship entities · summary 4.2k chars.
- **THE CATCH:** candidate pitches "Stripe is valued around $65–95B" →
  Cala: **$159B (February 2026 tender offer, +70% YoY)**.
  Source ✅ HTTP 200: <https://finance.yahoo.com/news/stripe-valuation-jumps-159-billion-131258707.html>
- Supporting: 19 total acquisitions; acquired Metronome (Jan 2026); founders Patrick & John
  Collison; backers Sequoia / a16z / Goldman; board incl. Mark Carney.

## Secondary — OpenAI  (`data/factpacks/openai.json`)
- 15 cited facts · 43 relationship entities · summary 6.4k chars · entityId resolved.
- **THE CATCH:** candidate says "OpenAI is private, no IPO" →
  Cala: **confidentially filed for IPO (June 2026), Q4 2026 listing, $852B–$1T valuation**.
  Primary source ⚠️ Bloomberg 403s for bots (works in-browser but consent/paywall):
  <https://www.bloomberg.com/news/articles/2026-03-31/openai-valued-at-852-billion-after-completing-122-billion-round>
  Cleaner alt source in the pack (TechCrunch, Jun 18 2026):
  <https://techcrunch.com/2026/06/18/openai-is-bringing-on-some-big-guns-in-the-lead-up-to-its-ipo/>
  → **TODO (M5 polish):** prefer the TechCrunch link over Bloomberg for the headline catch.
- Supporting catches: Sora shut down (Mar 2026); Microsoft ~49% stake; Sam Altman holds no equity.

## Demo arc (rehearse)
1. Land → Schedule → "Join now" (visible "Querying Cala.ai…" beat).
2. Spar: interviewer asks "pitch me Stripe." Candidate gives the **wrong valuation** on purpose.
3. Interviewer pushes back live (grounded on the injected pack).
4. Debrief: the exact quote flagged with the $159B correction + working Yahoo Finance link,
   inside a dense "N of M claims verified" scorecard.
5. Close on the wall of citations.

> Note: source URLs are real, dated articles in Cala's index. Re-verify they resolve the
> morning of the demo; swap company if any catch link rots.
