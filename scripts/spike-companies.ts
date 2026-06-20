// SPIKE: assess Cala coverage + recency for candidate demo companies.
// One knowledge_search call each (frugal on the 100-credit tier). Writes full content
// to data/cala-raw/spike-<name>.md and prints a coverage summary + recent dated lines.
//
// Run: npx tsx --env-file=.env scripts/spike-companies.ts

import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.CALA_API_BASE || 'https://api.cala.ai';
const KEY = process.env.CALA_API_KEY!;
mkdirSync('data/cala-raw', { recursive: true });

const CANDIDATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['Stripe', 'Anthropic', 'Databricks', 'CoreWeave', 'Shein'];

// Lines that look recent (2026 or recent-month phrasing) → candidate stale-LLM catches.
const RECENT = /\b2026\b|\b(?:Jan|Feb|Mar|Apr|May|Jun)(?:uary|ruary|ch|il|e)?\s+2026|recently|just (?:closed|announced|acquired)|last (?:month|week)/i;

async function ks(input: string) {
  const res = await fetch(`${BASE}/v1/knowledge/search`, {
    method: 'POST',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<{ content: string; context: unknown[]; entities: { name: string }[] }>;
}

(async () => {
  for (const name of CANDIDATES) {
    try {
      const r = await ks(
        `${name}: ownership, investors, recent acquisitions, CEO changes, funding, and latest news.`,
      );
      const content = r.content || '';
      const file = `data/cala-raw/spike-${name.replace(/\W+/g, '_')}.md`;
      writeFileSync(file, content);
      const recent = content
        .split('\n')
        .filter((l) => RECENT.test(l) && l.trim().length > 25)
        .slice(0, 6);
      console.log(`\n${'#'.repeat(60)}`);
      console.log(`# ${name}  —  ${content.length} chars · ${r.context?.length ?? 0} cited chunks · ${r.entities?.length ?? 0} entities`);
      console.log(`  file: ${file}`);
      console.log('  recent/dated lines (candidate stale-LLM catches):');
      recent.forEach((l) => console.log('   • ' + l.trim().slice(0, 160)));
      if (!recent.length) console.log('   (none matched — may be thin or undated)');
    } catch (e) {
      console.log(`\n# ${name} — ERROR: ${(e as Error).message.slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 1500)); // stay under 10 req/min
  }
})();
