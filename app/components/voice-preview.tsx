"use client";

// "Hear them" — audition a persona's opening line before committing to a live mic call.
//
// Two tiers, best first:
//   1. The REAL soundalike — GET /api/voice-preview?slug=<seed> streams the opening line in the
//      persona's pinned ElevenLabs voice (the same voice the live call uses). This is what makes
//      the preview actually sound like the persona.
//   2. Fallback — the browser's built-in SpeechSynthesis (Web Speech API): zero keys, zero cost,
//      offline, can't fail at the venue. Used when the persona has no pinned voice or the endpoint
//      is unavailable (it returns 204). Voice/pitch/rate are picked deterministically from the slug.

import { useEffect, useRef, useState } from "react";

/** Stable string hash (djb2) so the same persona always gets the same fallback voice. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function VoicePreview({ text, name, seed }: { text: string; name?: string; seed?: string }) {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // No browser TTS — we can still try the server soundalike, so only mark unsupported if we
      // also have no slug to query.
      if (!seed) setSupported(false);
      return;
    }
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load(); // some browsers populate synchronously…
    window.speechSynthesis.addEventListener("voiceschanged", load); // …others fire this later
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [seed]);

  // Stop whatever's currently playing (audio element + synthesis).
  function stopAll() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setLoading(false);
  }

  function speakViaBrowser() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const h = hash(seed ?? text);
    const all = voicesRef.current;
    const english = all.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const pool = english.length ? english : all;
    const u = new SpeechSynthesisUtterance(text);
    if (pool.length) u.voice = pool[h % pool.length];
    u.rate = 0.92 + (h % 16) / 100; // 0.92–1.07, slight per-persona variation
    u.pitch = 0.85 + (h % 30) / 100; // 0.85–1.14
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  async function play() {
    // Tier 1: the real ElevenLabs soundalike, if this persona has a pinned voice.
    if (seed) {
      setLoading(true);
      try {
        const res = await fetch(`/api/voice-preview?slug=${encodeURIComponent(seed)}`);
        if (res.ok && res.headers.get("content-type")?.includes("audio")) {
          const url = URL.createObjectURL(await res.blob());
          const audio = new Audio(url);
          audioRef.current = audio;
          const cleanup = () => {
            URL.revokeObjectURL(url);
            if (audioRef.current === audio) audioRef.current = null;
            setSpeaking(false);
          };
          audio.onended = cleanup;
          audio.onerror = cleanup;
          setLoading(false);
          setSpeaking(true);
          await audio.play();
          return;
        }
      } catch {
        // network/parse failure → fall through to the browser voice
      }
      setLoading(false);
    }
    // Tier 2: browser speech synthesis.
    speakViaBrowser();
  }

  function toggle() {
    if (speaking || loading) {
      stopAll();
      return;
    }
    void play();
  }

  if (!supported) return null;

  const busy = speaking || loading;
  return (
    <button
      type="button"
      onClick={toggle}
      title="Preview of the persona's opening line in their voice"
      aria-label={busy ? "Stop preview" : `Hear ${name ?? "the opening line"}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[0.72rem] font-medium transition-colors hover:border-ink/40 disabled:opacity-60"
      style={busy ? { color: "var(--verified)", borderColor: "color-mix(in srgb, var(--verified) 40%, transparent)" } : undefined}
    >
      <span aria-hidden>{loading ? "…" : speaking ? "■" : "▶"}</span>
      {loading ? "Loading" : speaking ? "Stop" : "Hear them"}
    </button>
  );
}
