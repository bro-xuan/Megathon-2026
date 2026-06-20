// M3 differentiator test — runs the Claude debrief against a SYNTHETIC transcript
// (no Vapi needed). Proves the stale-LLM catch is flagged with a cited correction.
// Run: npx tsx --env-file=.env scripts/test-debrief.ts

import { readCachedPack } from '../lib/factpack';
import { buildDebrief, debriefProvider } from '../lib/debrief';
import type { TranscriptTurn } from '../lib/types';

// A scripted mock interview on Stripe. The candidate makes:
//  - a correct claim (founders),
//  - the SCRIPTED BLUFF (valuation ~$65B — Cala says $159B as of Feb 2026),
//  - an unverifiable aside.
const TRANSCRIPT: TranscriptTurn[] = [
  { role: 'interviewer', text: 'Thanks for joining. Pitch me Stripe — start with the basics.' },
  { role: 'candidate', text: 'Sure. Stripe is a payments company founded in 2010 by the Collison brothers, Patrick and John.' },
  { role: 'interviewer', text: 'Good. And how would you frame its scale for an investor?' },
  { role: 'candidate', text: "It's still private, and last I checked it was valued around 65 billion dollars after a down round." },
  { role: 'interviewer', text: 'You sure about that number? Walk me through it.' },
  { role: 'candidate', text: "Yeah, roughly 65 billion. I think they also recently moved their headquarters to Dublin." },
  { role: 'interviewer', text: 'Interesting. Anything on recent M&A?' },
  { role: 'candidate', text: 'They acquired a metering company called Metronome to push into usage-based billing.' },
];

(async () => {
  const pack = await readCachedPack('Stripe');
  if (!pack) {
    console.error('No cached Stripe pack — run: npm run build:packs Stripe');
    process.exit(1);
  }
  console.log(`Loaded Stripe pack: ${pack.facts.length} cited facts. Reasoner: ${debriefProvider()}. Running debrief…\n`);

  const debrief = await buildDebrief(TRANSCRIPT, pack);

  console.log(`SCORE: ${debrief.score}/100`);
  console.log(`VERIFIED: ${debrief.verifiedCount} of ${debrief.totalClaims} claims\n`);

  console.log('CLAIMS:');
  for (const c of debrief.claims) {
    const tag = c.verdict.toUpperCase().padEnd(12);
    console.log(`  ${tag} "${c.quote.slice(0, 70)}"`);
    if (c.verdict === 'flagged') console.log(`               → correct: ${c.correctValue}\n                 ${c.sourceUrl}`);
    else if (c.verdict === 'verified') console.log(`               → ${c.sourceUrl}`);
  }

  console.log('\nFLAGS (bluffs caught):');
  for (const f of debrief.flags) {
    console.log(`  [${f.severity}] "${f.quote.slice(0, 60)}"\n     issue: ${f.issue}\n     correct: ${f.correctValue}\n     source: ${f.sourceUrl}`);
  }

  const caughtValuation = debrief.flags.some((f) => /159|billion|valu/i.test(f.correctValue + f.issue));
  console.log(`\n${caughtValuation ? '✅ CAUGHT the valuation bluff with a citation.' : '❌ Did NOT catch the valuation bluff.'}`);
})();
