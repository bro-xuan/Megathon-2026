// Freeze a canned transcript + perfect DebriefResult for mock/fallback mode (M5).
// If the live API hesitates on stage, /debrief/mock-stripe renders this instantly, offline.
// Run: npx tsx --env-file=.env scripts/build-mock.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { readCachedPack } from '../lib/factpack';
import { buildDebrief } from '../lib/debrief';
import type { TranscriptTurn } from '../lib/types';

const TARGET = 'Stripe';
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
  const pack = await readCachedPack(TARGET);
  if (!pack) throw new Error('Run: npm run build:packs Stripe');
  const debrief = await buildDebrief(TRANSCRIPT, [pack]);
  mkdirSync('data/mock', { recursive: true });
  const out = { target: TARGET, transcript: TRANSCRIPT, debrief };
  writeFileSync('data/mock/stripe.json', JSON.stringify(out, null, 2));
  console.log(`Wrote data/mock/stripe.json — score ${debrief.score}, ${debrief.flags.length} flags, ${debrief.totalClaims} claims.`);
})();
