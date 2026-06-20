// POST /api/debrief  { target, transcript } → DebriefResult (the M3 differentiator).
// Loads the cited fact pack for the target, then runs the post-call reasoner
// (Claude if ANTHROPIC_API_KEY, else GLM-5.2) to produce a citation-dense scorecard.

import { getFactPack } from '@/lib/factpack';
import { buildDebrief } from '@/lib/debrief';
import type { TranscriptTurn } from '@/lib/types';

export const maxDuration = 60; // the reasoner pass can take a while

export async function POST(request: Request) {
  let body: { target?: string; transcript?: TranscriptTurn[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { target, transcript } = body;
  if (!target || !Array.isArray(transcript) || transcript.length === 0) {
    return Response.json({ error: 'Need { target, transcript: TranscriptTurn[] }' }, { status: 400 });
  }
  try {
    const pack = await getFactPack(target);
    const debrief = await buildDebrief(transcript, pack);
    return Response.json(debrief);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Debrief failed';
    return Response.json({ error: message }, { status: 502 });
  }
}
