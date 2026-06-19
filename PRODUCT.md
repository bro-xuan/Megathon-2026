# Greenroom

> A voice-based practice partner for high-stakes conversations that knows the real facts — so when you bluff, it catches you, exactly like real life.

## The problem

The conversations that decide careers and deals — investment-banking interviews,
sales calls, investor pitches, negotiations — are won or lost on two things: how you
carry yourself, and whether you actually know the facts about the company or person
across the table.

People rehearse these in their head, or with a friend who knows nothing about the
counterparty. Generic AI voice tools roleplay fluently but **make up** the
counterparty's details, so they miss the single most common failure mode: confidently
saying something false about a real company. In a real IB interview, bluffing on a fact
is exactly how you lose.

## The product

You pick a scenario and a **real** target — a company, a deal, an interviewer at a
specific bank. Greenroom places a live voice call. The AI plays the other side of the
table, and it pulls **verified, cited facts about that real target in real time**. It
probes, objects, and fact-checks you mid-conversation:

- *"You said they're founder-led — their CEO isn't a founder. Are you sure?"*
- *"You pitched them as mid-market, but they're 5,000 employees. Walk me through that."*

After the call you get a transcript with every fact-check flagged and **sourced**, so
you know exactly where you bluffed.

## Hero use case: the IB / finance interview

Greenroom runs a live mock investment-banking interview by voice. It handles the parts a
generic LLM already knows (the technical drills), but its edge is the **markets and
company knowledge** part that sinks candidates:

- **"Pitch me a stock / a company."** You answer. Greenroom pulls that company's real
  profile and grills you on the facts — founders, owners, who funded them, recent
  activity — catching you when you're wrong.
- **"Tell me about a recent deal in [sector]."** Grounded in real entities, not
  hallucinated.
- Fresh, company-specific prompts every session instead of the same recycled 50
  questions.

## How it works

- **Vapi** — the live voice loop. A real high-stakes conversation is spoken, not typed,
  so voice is the product, not a bolt-on.
- **Cala** ([cala.ai](https://cala.ai)) — the moat. The AI interviewer's knowledge is
  grounded in real, current, **cited** entity data (companies, people, investors,
  relationships) via Cala's MCP server. This is the thing generic voice tools cannot do.
- **Two surfaces:**
  - **Study mode** — explore a target firm or sector as a cited knowledge graph before
    you go in.
  - **Spar mode** — the Vapi voice call that grills you on the same verified data.

## Why it wins

- **Both sponsors are load-bearing.** Strong candidate for the Cala prize (data is the
  moat) *and* the Vapi prize (voice is the product). One build, two prizes.
- **The user is in the room.** Every judge has sat a hard interview. Demoable live, on
  stage, on the presenter.
- **Depth, not breadth.** Platform story in the pitch ("practice any high-stakes
  conversation that turns on real facts"), one vertical — the IB interview — demoed
  deeply.

## Build cut order

1. **Vapi voice loop** — the demo.
2. **Cala fact-check mechanic** — the differentiator (pull real profile, catch the bluff).
3. **Knowledge-graph study mode** — nice-to-have visual.
