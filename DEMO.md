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
- 9 cited facts · 31 relationship entities · summary 3.6k chars · entityId resolved.
  (Rebuilt 2026-06-20: the long compound query tripped Cala's "too complex" guard and cached
  an empty pack — `buildFactPack` now retries simpler queries; see `lib/factpack.ts`.)
- **THE CATCH:** candidate says "OpenAI is private, no IPO" →
  Cala fact #5: **OpenAI has filed SEC paperwork for a potential IPO in 2026** (recruited Noam
  Shazeer & Dean Ball ahead of the offering); summary carries the **$852B (Mar 2026) valuation,
  $122B round**.
  Source ✅ HTTP 200 (bot-friendly — no Bloomberg paywall): Ars Technica, Jun 2026
  <https://arstechnica.com/ai/2026/06/leaked-financial-docs-show-openai-is-losing-billions-of-dollars-a-year/>
- Supporting: $157B → $300B → $852B valuation ladder; investors SoftBank (lead, $40B 2025 round)
  / Microsoft / NVIDIA / Thrive; acquired Tomoro; launched DeployCo consulting (Jun 2026).

## Demo arc (rehearse)
1. Land → Schedule → "Join now" (visible "Querying Cala.ai…" beat).
2. Spar: interviewer asks "pitch me Stripe." Candidate gives the **wrong valuation** on purpose.
3. Interviewer pushes back live (grounded on the injected pack).
4. Debrief: the exact quote flagged with the $159B correction + working Yahoo Finance link,
   inside a dense "N of M claims verified" scorecard.
5. Close on the wall of citations.

> Note: source URLs are real, dated articles in Cala's index. Re-verify they resolve the
> morning of the demo; swap company if any catch link rots.
