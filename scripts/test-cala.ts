// M0a Cala de-risk probe. Dumps the RAW Cala JSON so we can see the real citation
// shape (context[].origins[].source.{name,url}) before writing lib/factpack.ts.
//
// Run:  npx tsx --env-file=.env scripts/test-cala.ts "OpenAI"
// (pass a company name as the first arg; defaults to a known-rich one)

import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.CALA_API_BASE || 'https://api.cala.ai';
const KEY = process.env.CALA_API_KEY;
const target = process.argv[2] || 'OpenAI';
const RAW_DIR = 'data/cala-raw';
mkdirSync(RAW_DIR, { recursive: true });

if (!KEY) {
  console.error('CALA_API_KEY not set. Run with: npx tsx --env-file=.env scripts/test-cala.ts');
  process.exit(1);
}

type Attempt = { path: string; body?: unknown; method?: string };

async function probe(label: string, attempts: Attempt[]) {
  console.log(`\n${'='.repeat(70)}\n# ${label}\n${'='.repeat(70)}`);
  for (const { path, body, method = 'POST' } of attempts) {
    const url = `${BASE}${path}`;
    process.stdout.write(`\n→ ${method} ${path}  ${body ? 'body=' + JSON.stringify(body) : ''}\n`);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'X-API-KEY': KEY!, 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      });
      const text = await res.text();
      console.log(`  status ${res.status}`);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        console.log('  (non-JSON body)\n  ' + text.slice(0, 800));
        continue;
      }
      if (res.ok) {
        const file = `${RAW_DIR}/${label.split(' ')[0].replace(/[^a-z0-9_]/gi, '')}.json`;
        writeFileSync(file, JSON.stringify(parsed, null, 2));
        console.log(`  OK — full JSON written to ${file}`);
        console.log('  top-level keys: ' + Object.keys(parsed as object).join(', '));
        return parsed;
      }
      console.log('  ' + JSON.stringify(parsed, null, 2).split('\n').join('\n  ').slice(0, 1500));
    } catch (e) {
      console.log('  FETCH ERROR:', (e as Error).message);
    }
  }
  return null;
}

(async () => {
  console.log(`Cala probe — target="${target}" base=${BASE}`);

  await probe('knowledge_search (cited prose + entities)', [
    { path: '/v1/knowledge/search', body: { input: target } },
    { path: '/v1/knowledge/search', body: { input: `Tell me about ${target}: founders, owners, investors, recent news.` } },
  ]);

  const entity = await probe('entity_search (-> UUID)', [
    { path: `/v1/entities?name=${encodeURIComponent(target)}`, method: 'GET' },
  ]);

  // Try to pull an id out of whatever entity_search returned and retrieve it.
  const id = findId(entity);
  if (id) {
    await probe(`retrieveentity (${id})`, [
      { path: `/v1/entities/${id}`, method: 'GET' },
      { path: `/v1/entities/${id}`, method: 'POST', body: {} },
    ]);
  } else {
    console.log('\n(no entity id found to retrieve — inspect entity_search output above)');
  }

  console.log('\nDONE. Note the exact citation path (origins[].source.{name,url}).');
})();

function findId(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const seen = new Set<unknown>();
  const stack: unknown[] = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if ((k === 'id' || k === 'uuid' || k === 'entity_id') && typeof v === 'string') return v;
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}
