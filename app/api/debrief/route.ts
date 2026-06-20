// POST /api/debrief  { track, transcript } → AnyDebrief.
// Grounded tracks (stock-pitch, markets) → the M3 cited scorecard, checked against the merged
// prep library. Ungrounded tracks (behavioral, technical) → delivery-coaching review (no
// fact-check). Provider = Claude if ANTHROPIC_API_KEY, else GLM-5.2.

import { getPrepPacks, mergePacks } from '@/lib/factpack';
import { buildDebrief, buildGeneralDebrief } from '@/lib/debrief';
import { getTrack, PREP_TARGETS } from '@/lib/tracks';
import type { TranscriptTurn } from '@/lib/types';

export const maxDuration = 60; // the reasoner pass can take a while

export async function POST(request: Request) {
  let body: { track?: string; transcript?: TranscriptTurn[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { track: trackId, transcript } = body;
  const track = trackId ? getTrack(trackId) : undefined;
  if (!track || !Array.isArray(transcript) || transcript.length === 0) {
    return Response.json({ error: 'Need { track, transcript: TranscriptTurn[] }' }, { status: 400 });
  }
  try {
    if (track.grounded) {
      const pack = mergePacks(await getPrepPacks(PREP_TARGETS));
      return Response.json(await buildDebrief(transcript, pack));
    }
    return Response.json(await buildGeneralDebrief(transcript, track.title));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Debrief failed';
    return Response.json({ error: message }, { status: 502 });
  }
}
