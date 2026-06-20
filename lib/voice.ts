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

/**
 * ElevenLabs voice pinned to a specific distilled persona (slug → 11labs voiceId). Lets a marquee
 * persona use a hand-picked SOUNDALIKE instead of the generic default — e.g. our pre-distilled Elon
 * Musk demo persona reads in a measured, mid-pitch male voice rather than the shared default. This
 * is an AI approximation, not a clone of the real person's voice (see the dossier disclaimer).
 * Survives re-distillation because it lives in code, not in the cached persona JSON. Only honored
 * when ElevenLabs is enabled (VAPI_USE_ELEVENLABS=1); every other persona falls through to Aura-2.
 */
export const PERSONA_VOICE: Record<string, string> = {
  // Antoni — well-rounded, mid-pitch American male (ElevenLabs premade). Swap for a licensed clone
  // by editing this id, or set `voiceId` on the persona JSON to override per-profile.
  'elon-musk': 'ErXwobaYiN019PkySvjV',
};

/**
 * Free-tier ElevenLabs premade voices — every one verified to render on a free account (unlike
 * the Voice Library / "professional" voices, which 402 on free). This is the pool a distilled
 * persona draws from: each gets a distinct, natural human voice for the "Hear them" preview
 * (and the live call when ElevenLabs is enabled). The user can also pick one explicitly when
 * distilling. Voices are the new ElevenLabs default set; ids are stable.
 */
export type ElevenVoice = { id: string; name: string; gender: 'male' | 'female'; blurb: string };
export const ELEVEN_POOL: ElevenVoice[] = [
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', blurb: 'Laid-back, resonant' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'male', blurb: 'Smooth, trustworthy' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', blurb: 'Warm British storyteller' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'male', blurb: 'Deep, resonant' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'male', blurb: 'Charming, down-to-earth' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', blurb: 'Steady broadcaster (British)' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'male', blurb: 'Wise, mature' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', blurb: 'Dominant, firm' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', blurb: 'Mature, reassuring' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', blurb: 'Clear educator (British)' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', blurb: 'Knowledgeable, professional' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', gender: 'female', blurb: 'Professional, bright' },
];
export const ELEVEN_VOICE_IDS = new Set(ELEVEN_POOL.map((v) => v.id));

/** Look up a pool voice's display name from its id (for showing which voice a persona uses). */
export function elevenVoiceName(id?: string): string | undefined {
  return ELEVEN_POOL.find((v) => v.id === id)?.name;
}

/** Deterministic default voice from the pool for a persona slug — stable, distinct per person. */
export function defaultElevenVoiceId(seed: string): string {
  return ELEVEN_POOL[hash(seed) % ELEVEN_POOL.length].id;
}

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
 * Aura-2 voice pinned to a specific persona slug, used as the NO-credential fallback (when
 * ElevenLabs is off, so the persona's PERSONA_VOICE soundalike isn't available). Lets a pinned
 * persona keep a gender/character-appropriate voice instead of a random hash pick — e.g. our Elon
 * Musk demo reads in a confident male voice rather than possibly landing on a female one.
 */
const PERSONA_AURA: Record<string, string> = {
  'elon-musk': 'orpheus', // M — professional, confident (fallback until the 11labs soundalike is live)
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
  const pinned = TRACK_VOICE[seed] ?? PERSONA_AURA[seed];
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
