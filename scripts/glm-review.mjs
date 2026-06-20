// GLM (Z.ai coding-plan) document reviewer.
// Reads the GLM key from .zai_key (gitignored) or GLM_API_KEY env, sends a target
// file to GLM-4.6, and prints the review. Usage: node scripts/glm-review.mjs [path]
import { readFile } from 'node:fs/promises';

const BASE = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = process.env.GLM_MODEL || 'glm-5.2';
const target = process.argv[2] || 'PRD.md';

const key =
  process.env.GLM_API_KEY ||
  (await readFile(new URL('../.zai_key', import.meta.url), 'utf8').catch(() => '')).trim();
if (!key) throw new Error('No GLM key (set GLM_API_KEY or create .zai_key)');

const doc = await readFile(new URL(`../${target}`, import.meta.url), 'utf8');

const system =
  'You are a sharp, senior product+engineering reviewer for an early-stage hackathon project. ' +
  'Review the provided PRD critically and concisely. Cover: (1) clarity & coherence of the core ' +
  'concept, (2) scope realism for a ~1.5-day build, (3) technical/architecture risks, ' +
  '(4) gaps, contradictions, or missing decisions, (5) what to cut and what to protect, ' +
  '(6) the single biggest risk to the demo. Be specific, cite sections, and prioritize. ' +
  'Use markdown with short sections and bullet points.';

const res = await fetch(BASE, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    stream: false,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Review this PRD (\`${target}\`):\n\n---\n\n${doc}` },
    ],
  }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}`, await res.text());
  process.exit(1);
}
const data = await res.json();
const msg = data.choices?.[0]?.message?.content ?? '(no content)';
console.log(`# GLM review — ${MODEL} — ${target}\n`);
console.log(msg);
console.error(`\n[tokens: prompt ${data.usage?.prompt_tokens}, completion ${data.usage?.completion_tokens}]`);
