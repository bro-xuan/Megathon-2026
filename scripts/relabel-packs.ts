// Re-derive fact labels/categories on cached packs after a labeling-rule change (no Cala call).
// Run: npx tsx scripts/relabel-packs.ts [slug ...]   (default: all packs in data/factpacks)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { relabel } from '../lib/factpack';
import type { FactPack } from '../lib/types';

const DIR = path.join(process.cwd(), 'data', 'factpacks');

(async () => {
  const arg = process.argv.slice(2);
  const files = arg.length ? arg.map((s) => `${s}.json`) : (await readdir(DIR)).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const fp = path.join(DIR, file);
    const pack = JSON.parse(await readFile(fp, 'utf8')) as FactPack;
    const next = relabel(pack);
    await writeFile(fp, JSON.stringify(next, null, 2));
    console.log(`\n=== ${file} ===`);
    next.facts.forEach((f, i) => console.log(`  ${i} [${f.claim}] (${f.category})  ${f.value.slice(0, 70)}…`));
  }
})();
