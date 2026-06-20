// GET /api/voice-preview?slug=<persona> → MP3/WAV of the persona's opening line in their voice,
// powering the dossier's "Hear them" button so the preview sounds like the persona (not the
// browser's generic robotic TTS). Resolution order:
//
//   1. A pre-rendered clip at public/voices/<slug>.{mp3,wav,m4a,ogg} — drop in any audio (e.g. a
//      FakeYou-rendered real-Elon clip) and it wins. Instant, offline, demo-proof.
//   2. The persona's pinned ElevenLabs SOUNDALIKE (direct ElevenLabs API, works on the free tier
//      for premade voices — independent of the broken Vapi 11labs credential).
//   3. 204 → the client falls back to browser speech synthesis.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPersona } from '@/lib/persona';
import { PERSONA_VOICE, defaultElevenVoiceId } from '@/lib/voice';

// Pre-rendered clip formats we'll serve, in preference order.
const STATIC_AUDIO: [ext: string, mime: string][] = [
  ['mp3', 'audio/mpeg'],
  ['wav', 'audio/wav'],
  ['m4a', 'audio/mp4'],
  ['ogg', 'audio/ogg'],
];

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim();
  if (!slug || /[^a-z0-9-]/i.test(slug)) return new Response(null, { status: 400 });

  // 1. Pre-rendered static clip wins (the real-voice path).
  for (const [ext, mime] of STATIC_AUDIO) {
    const file = path.join(process.cwd(), 'public', 'voices', `${slug}.${ext}`);
    if (existsSync(file)) {
      return new Response(await readFile(file), {
        headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' },
      });
    }
  }

  // 2. Live ElevenLabs soundalike.
  const profile = await getPersona(slug);
  if (!profile) return new Response(null, { status: 204 });

  // Every persona resolves to a real voice: its own chosen voiceId → a curated pin → a stable
  // pool default keyed on the slug. So the preview is always a natural human voice.
  const voiceId = profile.voiceId ?? PERSONA_VOICE[slug] ?? defaultElevenVoiceId(slug);
  const key = process.env.ELEVENLABS_API_KEY;
  const text = profile.firstMessage?.trim();
  if (!key || !text) return new Response(null, { status: 204 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
    },
  );
  if (!res.ok || !res.body) return new Response(null, { status: 204 });

  return new Response(res.body, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
  });
}
