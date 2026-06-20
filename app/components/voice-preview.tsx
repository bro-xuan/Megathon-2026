"use client";

// "Hear them" — audition a persona's opening line before committing to a live mic call. Uses the
// browser's built-in SpeechSynthesis (Web Speech API): zero keys, zero cost, offline, can't fail
// at the venue. It is NOT the live call voice (that's Vapi's TTS) — it's a quick preview so the
// persona reads as a voice agent, not a text bio. Voice + pitch/rate are picked deterministically
// from the slug so each distilled person sounds distinct.

import { useEffect, useRef, useState } from "react";

/** Stable string hash (djb2) so the same persona always gets the same voice. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function VoicePreview({ text, name, seed }: { text: string; name?: string; seed?: string }) {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
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
  }, []);

  function pickVoice(h: number): SpeechSynthesisVoice | undefined {
    const all = voicesRef.current;
    if (!all.length) return undefined;
    const english = all.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const pool = english.length ? english : all;
    return pool[h % pool.length];
  }

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel(); // clear anything queued from another card
    const h = hash(seed ?? text);
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(h);
    if (v) u.voice = v;
    u.rate = 0.92 + (h % 16) / 100; // 0.92–1.07, slight per-persona variation
    u.pitch = 0.85 + (h % 30) / 100; // 0.85–1.14
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title="Browser preview voice — the live call uses a higher-fidelity voice"
      aria-label={speaking ? "Stop preview" : `Hear ${name ?? "the opening line"}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[0.72rem] font-medium transition-colors hover:border-ink/40"
      style={speaking ? { color: "var(--verified)", borderColor: "color-mix(in srgb, var(--verified) 40%, transparent)" } : undefined}
    >
      <span aria-hidden>{speaking ? "■" : "▶"}</span>
      {speaking ? "Stop" : "Hear them"}
    </button>
  );
}
