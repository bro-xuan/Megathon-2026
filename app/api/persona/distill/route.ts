// POST /api/persona/distill — build a persona on demand from a name (+ optional source links).
// Body: { name, baseTrack?, roundTitle?, links?: string[] }
// Reads each link into a cited corpus (best-effort), runs the distiller (Cala + LLM), caches the
// profile, and returns it with a per-source fetch log. This is the interactive counterpart to the
// `npm run distill` CLI — the slow path (fetches + Cala + synthesis), so allow a longer budget.

import { distillPersona, savePersona } from '@/lib/persona';
import { fetchCorpus } from '@/lib/corpus-fetch';
import { getTrack } from '@/lib/tracks';

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { name?: string; baseTrack?: string; roundTitle?: string; links?: string[]; voiceId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'A person name is required' }, { status: 400 });

  const baseTrack = body.baseTrack?.trim() || 'markets';
  const roundTitle = body.roundTitle?.trim() || getTrack(baseTrack)?.title || 'Defend the valuation';
  const links = Array.isArray(body.links) ? body.links : [];
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId : undefined;

  try {
    const { segments, log } = links.length
      ? await fetchCorpus(links)
      : { segments: [], log: [] };

    const profile = await distillPersona(name, { baseTrack, roundTitle, corpus: segments, voiceId });
    await savePersona(profile);

    return Response.json({ profile, fetchLog: log });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Distillation failed';
    return Response.json({ error: message }, { status: 502 });
  }
}
