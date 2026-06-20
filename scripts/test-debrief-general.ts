// Ungrounded-track debrief test — runs buildGeneralDebrief (delivery coaching, no fact-check)
// against a SYNTHETIC behavioral transcript. Proves the GLM general path returns a score +
// strengths/improvements (the behavioral/technical debrief introduced with the track reframe).
// Run: npx tsx --env-file=.env scripts/test-debrief-general.ts

import { buildGeneralDebrief, debriefProvider } from '../lib/debrief';
import type { TranscriptTurn } from '../lib/types';

const TRANSCRIPT: TranscriptTurn[] = [
  { role: 'interviewer', text: "Let's start with you — walk me through your story. Why investment banking, and why now?" },
  { role: 'candidate', text: 'Sure. I studied economics, did a summer at a boutique advisory, and I love the pace of live deals — I want to be where the analysis meets a real transaction.' },
  { role: 'interviewer', text: 'What would your last manager say is your biggest weakness?' },
  { role: 'candidate', text: 'Probably that I go too deep on the model and lose the deadline. I am working on time-boxing my first pass.' },
  { role: 'interviewer', text: 'Why our bank specifically?' },
  { role: 'candidate', text: 'Honestly the people — everyone I met on the coffee chats was sharp and direct, and your healthcare franchise is exactly the sector I want.' },
];

(async () => {
  console.log(`Reasoner: ${debriefProvider()}. Running GENERAL debrief (Behavioral)…\n`);

  const debrief = await buildGeneralDebrief(TRANSCRIPT, 'Behavioral');

  console.log(`mode: ${debrief.mode}`);
  console.log(`SCORE: ${debrief.score}/100`);
  console.log(`SUMMARY: ${debrief.summary}\n`);
  console.log('STRENGTHS:');
  for (const s of debrief.strengths) console.log(`  ✓ ${s}`);
  console.log('\nIMPROVEMENTS:');
  for (const s of debrief.improvements) console.log(`  → ${s}`);

  const ok =
    debrief.mode === 'general' &&
    debrief.score >= 0 &&
    debrief.score <= 100 &&
    debrief.strengths.length > 0 &&
    debrief.improvements.length > 0 &&
    !!debrief.summary;
  console.log(`\n${ok ? '✅ General debrief returned a valid coaching scorecard.' : '❌ General debrief shape invalid.'}`);
  process.exit(ok ? 0 : 1);
})();
