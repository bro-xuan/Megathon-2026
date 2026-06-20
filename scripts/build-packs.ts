// Pre-build + cache fact packs for the curated demo companies.
// Run: npx tsx --env-file=.env scripts/build-packs.ts [Company ...]

import { getFactPack } from '../lib/factpack';

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['Stripe', 'OpenAI'];

(async () => {
  for (const t of targets) {
    const pack = await getFactPack(t, { refresh: true });
    const byCat = pack.facts.reduce<Record<string, number>>((a, f) => {
      a[f.category ?? 'overview'] = (a[f.category ?? 'overview'] ?? 0) + 1;
      return a;
    }, {});
    console.log(`\n=== ${t} ===`);
    console.log(`entityId: ${pack.entityId || '(none)'} | summary ${pack.summary.length} chars`);
    console.log(`facts: ${pack.facts.length}  by category: ${JSON.stringify(byCat)}`);
    console.log(`relationships: ${pack.relationships.length}`);
    console.log('sample cited facts:');
    for (const f of pack.facts.slice(0, 4)) {
      console.log(`  • [${f.claim}] ${f.value.slice(0, 90)}…  → ${f.sourceUrl}`);
    }
  }
})();
