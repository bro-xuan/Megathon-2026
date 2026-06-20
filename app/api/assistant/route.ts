// GET /api/assistant?track=stock-pitch → inline Vapi assistant config (grounded interviewer
// + injected prep packs). Built server-side so the ElevenLabs voiceId comes from env, not the
// client. The Groq/ElevenLabs provider keys live in the Vapi dashboard (BYO, $0 passthrough);
// the browser only needs NEXT_PUBLIC_VAPI_PUBLIC_KEY to start the call.
//
// Grounded tracks inject the WHOLE prep library (PREP_TARGETS); ungrounded tracks get no packs.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPrepPacks } from '@/lib/factpack';
import { getPersona } from '@/lib/persona';
import { buildAssistant, buildPersonaAssistant } from '@/lib/vapi-assistant';
import { PERSONA_VOICE } from '@/lib/voice';
import { getTrack, PREP_TARGETS } from '@/lib/tracks';
import type { FactPack } from '@/lib/types';

// Slim, client-safe fact list for the live "facts in play" rail — the cited topics the
// interviewer can probe. No prompt text leaks; just claim + company + source. Deduped by
// company+topic so the rail shows one chip per probe-able topic (no repeated labels).
function slimFacts(packs: FactPack[]) {
  const seen = new Set<string>();
  return packs.flatMap((p) =>
    p.facts.flatMap((f) => {
      const key = `${p.target}·${f.claim}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ claim: f.claim, target: p.target, sourceName: f.sourceName, sourceUrl: f.sourceUrl }];
    }),
  );
}

// Persistent Vapi assistant ids (one per track) written by `npm run sync:vapi`. When present we
// hand the client the dashboard assistant id; the inline `assistant` below stays as the fallback.
async function persistedAssistantId(trackId: string): Promise<string | undefined> {
  const file = path.join(process.cwd(), 'data', 'vapi-assistants.json');
  if (!existsSync(file)) return undefined;
  try {
    const map = JSON.parse(await readFile(file, 'utf8')) as Record<string, string>;
    return map[trackId];
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const trackId = url.searchParams.get('track')?.trim();
  const personaSlug = url.searchParams.get('persona')?.trim();
  const candidateName = url.searchParams.get('name')?.trim() || undefined;
  // ElevenLabs voice is an opt-in upgrade: only used once a VALID 11labs credential is registered
  // in Vapi (set VAPI_USE_ELEVENLABS=1). When off, voiceId is undefined and the assistant falls
  // back to a Deepgram Aura-2 voice (Vapi-managed, no BYO key) — see lib/voice.ts.
  const useEleven = process.env.VAPI_USE_ELEVENLABS === '1';
  const voiceId = useEleven ? process.env.ELEVENLABS_VOICE_ID : undefined;

  try {
    // A distilled persona runs an existing grounded round, but the interviewer is a real person:
    // inline assistant only (no persisted dashboard id), grounded on the same PREP_TARGETS.
    if (personaSlug) {
      const profile = await getPersona(personaSlug);
      if (!profile) return Response.json({ error: 'Unknown ?persona=' }, { status: 400 });
      const base = getTrack(profile.baseTrack);
      const packs = base?.grounded ? await getPrepPacks(PREP_TARGETS) : [];
      // Voice precedence. The ElevenLabs SOUNDALIKE (the persona's own voiceId, or our curated
      // PERSONA_VOICE pin, else the global default) is used ONLY when ElevenLabs is enabled
      // (VAPI_USE_ELEVENLABS=1) — which signals the 11labs provider credential is registered in
      // Vapi. When off, voiceId stays undefined and the assistant falls back to a Deepgram Aura-2
      // voice (Vapi-managed, no credential needed) — for pinned personas, a fitting one (see
      // PERSONA_AURA in lib/voice.ts). This way the demo never hard-fails on a missing credential:
      // flip the flag once the credential lands and the soundalike auto-engages, no code change.
      const personaVoiceId = useEleven
        ? profile.voiceId ?? PERSONA_VOICE[profile.slug] ?? voiceId
        : undefined;
      const assistant = buildPersonaAssistant(profile, packs, { candidateName, voiceId: personaVoiceId });
      const factCount = packs.reduce((n, p) => n + p.facts.length, 0);
      return Response.json({ assistant, assistantId: undefined, factCount, facts: slimFacts(packs) });
    }

    const track = trackId ? getTrack(trackId) : undefined;
    if (!track) return Response.json({ error: 'Missing or unknown ?track=' }, { status: 400 });
    const packs = track.grounded ? await getPrepPacks(PREP_TARGETS) : [];
    const assistant = buildAssistant(track, packs, { candidateName, voiceId });
    const factCount = packs.reduce((n, p) => n + p.facts.length, 0);
    const assistantId = await persistedAssistantId(track.id);
    return Response.json({ assistant, assistantId, factCount, facts: slimFacts(packs) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build assistant';
    return Response.json({ error: message }, { status: 502 });
  }
}
