// Distill a real person into a cached interviewer persona (JSON + MD dossier).
// Run:  npm run distill -- "Aswath Damodaran" [baseTrack] [roundTitle]
//
// Pulls cited knowledge from Cala and synthesizes the STYLE layer (tone, cadence, verbatim
// quotes) from a cited corpus at data/personas/raw/<slug>.json — a JSON array of
// { text, sourceUrl, sourceName } segments of the person's own public words. The corpus is
// optional: without it you still get a style-driven persona, just no verbatim quotes.

import { distillPersona, readCorpus, savePersona } from '../lib/persona';
import { slugify } from '../lib/factpack';

const [name, baseTrack = 'markets', roundTitle = 'Defend the valuation'] = process.argv.slice(2);

if (!name) {
  console.error('Usage: npm run distill -- "<Person Name>" [baseTrack] [roundTitle]');
  process.exit(1);
}

(async () => {
  const slug = slugify(name);
  const corpus = await readCorpus(slug);
  console.log(`Distilling "${name}" → round "${baseTrack}" · corpus segments: ${corpus.length}`);

  const profile = await distillPersona(name, { baseTrack, roundTitle, corpus });
  const { json, md } = await savePersona(profile);

  console.log(`\n=== ${profile.name} — ${profile.role} ===`);
  console.log(profile.headline);
  console.log(`\nObjective: ${profile.objective}`);
  console.log(`Opening:   "${profile.firstMessage}"`);
  console.log(`\nStyle tone: ${profile.style.tone}`);
  console.log(`Signature:  ${profile.style.signaturePhrases.join(' · ') || '(none)'}`);
  console.log(`Pet topics: ${profile.style.petTopics.join(' · ') || '(none)'}`);
  console.log(`\nCited quotes:    ${profile.quotes.length}`);
  console.log(`Cited knowledge: ${profile.knowledge.facts.length} facts`);
  console.log(`Sources:         ${profile.sources.length}`);
  console.log(`\nWrote:\n  ${json}\n  ${md}`);
})().catch((e) => {
  console.error('Distill failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
