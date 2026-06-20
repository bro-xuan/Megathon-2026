// One-off: pressure-test PRD.md + TASKS.md together with GLM-5.2.
// Reasoning ON (we want depth) but a high max_tokens so hidden reasoning_content
// can't starve the visible content (documented GLM gotcha). Usage: node scripts/glm-pressure-test.mjs
import { readFile } from 'node:fs/promises';

const BASE = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = process.env.GLM_MODEL || 'glm-5.2';

const key =
  process.env.GLM_API_KEY ||
  (await readFile(new URL('../.zai_key', import.meta.url), 'utf8').catch(() => '')).trim();
if (!key) throw new Error('No GLM key (set GLM_API_KEY or create .zai_key)');

const prd = await readFile(new URL('../PRD.md', import.meta.url), 'utf8');
const tasks = await readFile(new URL('../TASKS.md', import.meta.url), 'utf8');

const system =
  'You are a sharp, skeptical senior product+engineering reviewer pressure-testing a HACKATHON ' +
  'project with a HARD 2-DAY (~1.5 build-day) deadline. Two solo/small-team builders. The goal ' +
  'is to WIN two sponsor prizes (Cala = cited data; Vapi = voice). Be adversarial and concrete, ' +
  'not encouraging. Review PRD.md and TASKS.md TOGETHER. Cover: (1) Is the scope actually ' +
  'finishable in 2 days, or is it fantasy? Name the specific tasks most likely to blow the ' +
  'timebox. (2) Coherence/contradictions BETWEEN the two docs and within each. (3) The single ' +
  'biggest risk to a live demo, and the fastest mitigation. (4) Is Cala actually load-bearing or ' +
  'still garnish? Will judges believe it beats a plain LLM? (5) What to CUT to de-risk shipping, ' +
  'and what to PROTECT at all costs. (6) Any sequencing/dependency traps (e.g. choices that ' +
  'cannot be made until an API is poked). Prioritize ruthlessly. Use short markdown sections + ' +
  'bullets. End with a one-paragraph "If I had to bet, here is what kills the demo" verdict.';

const res = await fetch(BASE, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    stream: false,
    max_tokens: 16000,
    thinking: { type: 'enabled' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Pressure-test these two docs together for a 2-day hackathon build.\n\n=== PRD.md ===\n\n${prd}\n\n=== TASKS.md ===\n\n${tasks}`,
      },
    ],
  }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}`, await res.text());
  process.exit(1);
}
const data = await res.json();
const msg = data.choices?.[0]?.message?.content ?? '(no content)';
console.log(`# GLM pressure-test — ${MODEL} — PRD.md + TASKS.md\n`);
console.log(msg);
console.error(
  `\n[tokens: prompt ${data.usage?.prompt_tokens}, completion ${data.usage?.completion_tokens}; content chars: ${msg.length}]`,
);
