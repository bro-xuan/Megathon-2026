// GET /api/assistant?track=stock-pitch → inline Vapi assistant config (grounded interviewer
// + injected prep packs). Built server-side so the ElevenLabs voiceId comes from env, not the
// client. The Groq/ElevenLabs provider keys live in the Vapi dashboard (BYO, $0 passthrough);
// the browser only needs NEXT_PUBLIC_VAPI_PUBLIC_KEY to start the call.
//
// Grounded tracks inject the WHOLE prep library (PREP_TARGETS); ungrounded tracks get no packs.

import { getPrepPacks } from '@/lib/factpack';
import { buildAssistant } from '@/lib/vapi-assistant';
import { getTrack, PREP_TARGETS } from '@/lib/tracks';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const trackId = url.searchParams.get('track')?.trim();
  const candidateName = url.searchParams.get('name')?.trim() || undefined;
  const track = trackId ? getTrack(trackId) : undefined;
  if (!track) return Response.json({ error: 'Missing or unknown ?track=' }, { status: 400 });
  try {
    const packs = track.grounded ? await getPrepPacks(PREP_TARGETS) : [];
    // ElevenLabs voice is opt-in: only used once a VALID 11labs credential is registered in
    // Vapi (set VAPI_USE_ELEVENLABS=1). Otherwise omit voice → Vapi's built-in default voice,
    // so the call still works on Groq alone.
    const useEleven = process.env.VAPI_USE_ELEVENLABS === '1';
    const assistant = buildAssistant(track, packs, {
      candidateName,
      voiceId: useEleven ? process.env.ELEVENLABS_VOICE_ID : undefined,
    });
    const factCount = packs.reduce((n, p) => n + p.facts.length, 0);
    // Slim, client-safe fact list for the live "facts in play" rail — the cited topics
    // the interviewer can probe. No prompt text leaks; just claim + company + source.
    const facts = packs.flatMap((p) =>
      p.facts.map((f) => ({
        claim: f.claim,
        target: p.target,
        sourceName: f.sourceName,
        sourceUrl: f.sourceUrl,
      })),
    );
    return Response.json({ assistant, factCount, facts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build assistant';
    return Response.json({ error: message }, { status: 502 });
  }
}
