"use client";

// Pick the voice a distilled persona will speak in. A grid of free ElevenLabs pool voices, each
// auditionable (▶ plays a short sample via /api/voice-sample). "Auto" lets the server assign a
// stable default from the slug. Selection is a plain voiceId string passed up via onChange.

import { useRef, useState } from "react";
import { ELEVEN_POOL } from "@/lib/voice";

export function VoicePicker({
  value,
  onChange,
  disabled,
}: {
  value: string; // "" = Auto
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
    setLoading(null);
  }

  async function sample(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (playing === id || loading === id) {
      stop();
      return;
    }
    stop();
    setLoading(id);
    try {
      const res = await fetch(`/api/voice-sample?voiceId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setLoading(null);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setPlaying(null);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      setLoading(null);
      setPlaying(id);
      await audio.play();
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {/* Auto */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("")}
        className="voice-chip"
        data-selected={value === ""}
      >
        <span className="font-medium text-[0.9rem]">Auto</span>
        <span className="text-muted text-[0.72rem]">Pick for me</span>
      </button>

      {ELEVEN_POOL.map((v) => {
        const busy = playing === v.id || loading === v.id;
        return (
          <div
            key={v.id}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={value === v.id}
            onClick={() => !disabled && onChange(v.id)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(v.id);
              }
            }}
            className="voice-chip cursor-pointer"
            data-selected={value === v.id}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-medium text-[0.9rem]">{v.name}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={busy ? `Stop ${v.name} sample` : `Play ${v.name} sample`}
                onClick={(e) => sample(v.id, e)}
                className="shrink-0 w-[1.4rem] h-[1.4rem] rounded-full border border-border flex items-center justify-center text-[0.6rem] hover:border-ink/40 transition-colors"
                style={busy ? { color: "var(--verified)", borderColor: "color-mix(in srgb, var(--verified) 45%, transparent)" } : undefined}
              >
                {loading === v.id ? "…" : playing === v.id ? "■" : "▶"}
              </button>
            </div>
            <span className="text-muted text-[0.72rem] leading-tight">
              {v.gender === "male" ? "♂" : "♀"} {v.blurb}
            </span>
          </div>
        );
      })}
    </div>
  );
}
