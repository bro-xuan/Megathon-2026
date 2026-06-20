// Interviewer voice + turn-taking config, in one place. No secrets, no env reads → safe to import
// anywhere (client or server). Pure functions: the server decides whether to pass an ElevenLabs
// override id; everything else is deterministic from a seed.
//
// WHY THIS EXISTS: the assistants used to ship with NO `voice` block, so Vapi fell back to its
// generic default voice — robotic, and slow to start (which also made turns feel laggy). We now
// always attach a real voice. Default = Deepgram Aura-2, because Deepgram is already a Vapi-managed
// provider here (it powers our transcriber with no BYO key), so this needs zero dashboard setup and
// has sub-250ms first-byte. ElevenLabs stays an opt-in upgrade (register an 11labs key in Vapi +
// pass a voiceId) for higher expressiveness.

export type VapiVoice =
  | { provider: 'deepgram'; voiceId: string; model: 'aura-2' }
  | { provider: '11labs'; voiceId: string; model: string };

/**
 * Curated Aura-2 pool: professional, broadcast-clean American-English voices, mixed gender so
 * distilled personas and the different rounds don't all sound identical. voiceId is Deepgram's
 * short name (Vapi pairs it with model:'aura-2'). Characteristics are Deepgram's own descriptors.
 */
export const AURA_POOL: { voiceId: string; label: string }[] = [
  { voiceId: 'orpheus', label: 'Orpheus — professional, confident, trustworthy (M)' },
  { voiceId: 'harmonia', label: 'Harmonia — clear, calm, confident (F)' },
  { voiceId: 'jupiter', label: 'Jupiter — knowledgeable, baritone (M)' },
  { voiceId: 'electra', label: 'Electra — professional, engaging (F)' },
  { voiceId: 'hermes', label: 'Hermes — expressive, engaging (M)' },
];

/** Stable string hash (djb2) so the same seed always maps to the same voice. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// Explicit voice per fixed track. Hashing the 4 short track ids collided 3-of-4 onto one voice,
// so the rounds are pinned by hand for a deliberate 2M/2F spread. Personas (open-ended slug set)
// fall through to the hash below, where collisions are rare and harmless.
const TRACK_VOICE: Record<string, string> = {
  'stock-pitch': 'orpheus', // M — professional, confident
  markets: 'harmonia',      // F — clear, calm, confident
  behavioral: 'electra',    // F — professional, engaging
  technical: 'jupiter',     // M — knowledgeable, baritone
};

/**
 * Pick the interviewer's live-call voice.
 * - `elevenVoiceId` (server passes it only when ElevenLabs is enabled) → ElevenLabs Turbo v2.5.
 * - a known track id → its pinned Aura-2 voice (TRACK_VOICE).
 * - otherwise (personas) → a deterministic Aura-2 voice from the pool, keyed on `seed` (the
 *   persona slug) so each distilled person gets a distinct but stable voice.
 */
export function pickInterviewerVoice(seed: string, elevenVoiceId?: string): VapiVoice {
  if (elevenVoiceId) {
    // eleven_turbo_v2_5: lowest-latency ElevenLabs model — keeps live turns snappy.
    return { provider: '11labs', voiceId: elevenVoiceId, model: 'eleven_turbo_v2_5' };
  }
  const pinned = TRACK_VOICE[seed];
  const voiceId = pinned ?? AURA_POOL[hash(seed) % AURA_POOL.length].voiceId;
  return { provider: 'deepgram', voiceId, model: 'aura-2' };
}

// Turn-taking, defined once and shared by every assistant. smartEndpointingPlan is an ML turn
// detector (knows a mid-sentence pause from "done talking"); waitSeconds is the minimum silence on
// top of it. Dropped 0.4 → 0.2 so the interviewer answers sooner after you stop — the faster Aura-2
// TTS start does the rest. stopSpeakingPlan lets the candidate barge in over the interviewer.
export const START_SPEAKING_PLAN = {
  waitSeconds: 0.2,
  smartEndpointingPlan: { provider: 'livekit' as const },
};

export const STOP_SPEAKING_PLAN = {
  numWords: 0,
  voiceSeconds: 0.2,
  backoffSeconds: 1,
};
