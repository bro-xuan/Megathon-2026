// GET /api/assistant?target=Stripe → inline Vapi assistant config (grounded interviewer
// + injected fact pack). Built server-side so the ElevenLabs voiceId comes from env, not the
// client. The Groq/ElevenLabs provider keys live in the Vapi dashboard (BYO, $0 passthrough);
// the browser only needs NEXT_PUBLIC_VAPI_PUBLIC_KEY to start the call.

import { getFactPack } from '@/lib/factpack';
import { buildAssistant } from '@/lib/vapi-assistant';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('target')?.trim();
  const candidateName = url.searchParams.get('name')?.trim() || undefined;
  if (!target) return Response.json({ error: 'Missing ?target=' }, { status: 400 });
  try {
    const pack = await getFactPack(target);
    // ElevenLabs voice is opt-in: only used once a VALID 11labs credential is registered in
    // Vapi (set VAPI_USE_ELEVENLABS=1). Otherwise omit voice → Vapi's built-in default voice,
    // so the call still works on Groq alone.
    const useEleven = process.env.VAPI_USE_ELEVENLABS === '1';
    const assistant = buildAssistant(pack, {
      candidateName,
      voiceId: useEleven ? process.env.ELEVENLABS_VOICE_ID : undefined,
    });
    return Response.json({ assistant, factCount: pack.facts.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build assistant';
    return Response.json({ error: message }, { status: 502 });
  }
}
