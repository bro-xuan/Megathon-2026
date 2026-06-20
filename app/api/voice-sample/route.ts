// GET /api/voice-sample?voiceId=<id> → a short MP3 sample of a pool voice, for the voice picker
// in the distill flow. voiceId must be one of our free-tier ElevenLabs pool voices (validated, so
// this can't be turned into an open TTS proxy on arbitrary/paid voices).

import { ELEVEN_VOICE_IDS } from '@/lib/voice';

const SAMPLE = "Let's begin. Walk me through your thinking, step by step — and don't skip the hard part.";

export async function GET(request: Request) {
  const voiceId = new URL(request.url).searchParams.get('voiceId')?.trim();
  if (!voiceId || !ELEVEN_VOICE_IDS.has(voiceId)) return new Response(null, { status: 400 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response(null, { status: 204 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: SAMPLE, model_id: 'eleven_turbo_v2_5' }),
    },
  );
  if (!res.ok || !res.body) return new Response(null, { status: 204 });

  return new Response(res.body, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
  });
}
