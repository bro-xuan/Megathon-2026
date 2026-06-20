// Create/update persistent Vapi assistants — one per track — so they show up in the Vapi
// dashboard (Assistants list, not just Call Logs). They carry the SAME config we'd otherwise
// inject inline: persona + the cited fact packs. The packs are static cached JSON (data/
// factpacks/*), so baking them into a dashboard assistant is safe — just re-run this after
// `npm run build:packs` if the packs change.
//
// Writes data/vapi-assistants.json (trackId → assistantId); /api/assistant prefers that id over
// the inline config, and the inline build stays as the fallback (demo insurance).
//
// Usage: npm run sync:vapi   (runs via tsx --env-file=.env, so VAPI_PRIVATE_KEY is loaded)

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TRACKS, PREP_TARGETS } from '../lib/tracks';
import { getPrepPacks } from '../lib/factpack';
import { buildAssistant } from '../lib/vapi-assistant';

const API = 'https://api.vapi.ai';
const KEY = process.env.VAPI_PRIVATE_KEY;
if (!KEY) throw new Error('VAPI_PRIVATE_KEY not set (it lives in .env; run via `npm run sync:vapi`)');

// Voice is opt-in, mirroring /api/assistant: only attach an ElevenLabs voiceId when a valid
// 11labs credential is registered in Vapi and VAPI_USE_ELEVENLABS=1.
const voiceId = process.env.VAPI_USE_ELEVENLABS === '1' ? process.env.ELEVENLABS_VOICE_ID : undefined;

async function vapi(pathname: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vapi ${init.method ?? 'GET'} ${pathname} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  // Upsert by name so re-runs update in place instead of piling up duplicates.
  const existing: { id: string; name: string }[] = await vapi('/assistant?limit=100');
  const idByName = new Map(existing.map((a) => [a.name, a.id]));

  const map: Record<string, string> = {};
  for (const track of TRACKS) {
    const packs = track.grounded ? await getPrepPacks(PREP_TARGETS) : [];
    const assistant = buildAssistant(track, packs, { voiceId });
    const existingId = idByName.get(assistant.name);
    const saved = existingId
      ? await vapi(`/assistant/${existingId}`, { method: 'PATCH', body: JSON.stringify(assistant) })
      : await vapi('/assistant', { method: 'POST', body: JSON.stringify(assistant) });
    map[track.id] = saved.id;
    console.log(`${existingId ? 'updated' : 'created'}  ${track.id.padEnd(12)} → ${saved.id}  (${assistant.name})`);
  }

  // Prune stale "Greenroom —" assistants (e.g. left over from a renamed track) so the dashboard
  // shows exactly the current roster and re-runs never orphan duplicates.
  const wanted = new Set(TRACKS.map((t) => `Greenroom — ${t.title}`));
  for (const a of existing) {
    if (a.name.startsWith('Greenroom — ') && !wanted.has(a.name)) {
      await vapi(`/assistant/${a.id}`, { method: 'DELETE' });
      console.log(`pruned   stale        → ${a.id}  (${a.name})`);
    }
  }

  const out = path.join(process.cwd(), 'data', 'vapi-assistants.json');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(map, null, 2) + '\n');
  console.log(`\nWrote ${out} — ${Object.keys(map).length} assistants. They now appear in the Vapi dashboard.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
