// GET /api/voice-preview?slug=<persona> → MP3 of the persona's opening line in their pinned
// ElevenLabs SOUNDALIKE voice. This powers the dossier's "Hear them" button so the preview
// actually sounds like the persona's call voice, instead of the browser's generic robotic TTS.
//
// It hits ElevenLabs DIRECTLY (server-side, key from .env) — which works on the free tier for
// premade voices — so the preview is unaffected by the separate, currently-broken Vapi 11labs
// credential used for the live call. If the persona has no pinned ElevenLabs voice (or no key),
// we return 204 so the client falls back to browser speech synthesis.

import { getPersona } from '@/lib/persona';
import { PERSONA_VOICE } from '@/lib/voice';

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim();
  if (!slug) return new Response(null, { status: 400 });

  const profile = await getPersona(slug);
  if (!profile) return new Response(null, { status: 204 });

  const voiceId = profile.voiceId ?? PERSONA_VOICE[slug];
  const key = process.env.ELEVENLABS_API_KEY;
  if (!voiceId || !key) return new Response(null, { status: 204 }); // → client uses browser TTS

  const text = profile.firstMessage?.trim();
  if (!text) return new Response(null, { status: 204 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      // turbo v2.5: lowest-latency model — same one the live call uses, so the preview matches.
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
    },
  );
  if (!res.ok || !res.body) {
    // Don't surface ElevenLabs errors to the UI — let the client fall back gracefully.
    return new Response(null, { status: 204 });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      // Same opening line + voice every time → safe to cache.
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
