"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import Vapi from "@vapi-ai/web";
import { getTrack } from "@/lib/tracks";
import type { TranscriptTurn } from "@/lib/types";

type Phase = "idle" | "connecting" | "live" | "debriefing" | "error";

export default function SparPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: trackId } = use(params);
  const track = getTrack(trackId);
  const router = useRouter();

  const vapiRef = useRef<Vapi | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  if (!track) notFound();

  async function join() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set (Vapi key pending).");
      setPhase("error");
      return;
    }
    setPhase("connecting");
    try {
      const res = await fetch(`/api/assistant?track=${encodeURIComponent(track!.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load assistant");

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      vapi.on("call-start", () => setPhase("live"));
      vapi.on("speech-start", () => setSpeaking(true));
      vapi.on("speech-end", () => setSpeaking(false));
      vapi.on("error", (e: unknown) => {
        setError(e instanceof Error ? e.message : "Vapi error");
        setPhase("error");
      });
      vapi.on("message", (msg: { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
        if (msg.type === "transcript" && msg.transcriptType === "final" && msg.transcript) {
          setTurns((prev) => [
            ...prev,
            { role: msg.role === "user" ? "candidate" : "interviewer", text: msg.transcript! },
          ]);
        }
      });
      await vapi.start(data.assistant);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start call");
      setPhase("error");
    }
  }

  function toggleMute() {
    const v = vapiRef.current;
    if (!v) return;
    const next = !muted;
    v.setMuted(next);
    setMuted(next);
  }

  async function endInterview() {
    vapiRef.current?.stop();
    setPhase("debriefing");
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: track!.id, transcript: turns }),
      });
      const debrief = await res.json();
      if (!res.ok) throw new Error(debrief.error ?? "Debrief failed");
      sessionStorage.setItem(
        "greenroom:debrief",
        JSON.stringify({ label: track!.title, grounded: track!.grounded, transcript: turns, debrief }),
      );
      router.push("/debrief/live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debrief failed");
      setPhase("error");
    }
  }

  const grounded = track!.grounded;

  // Briefing (pre-call). Citations can't show mid-call (it's audio), so make the persona,
  // objective, and CITED knowledge visible HERE — grounding bookends the experience
  // (prep → call → debrief). "Start the call" runs join().
  if (phase === "idle") {
    return (
      <main className="container-page py-[3rem] flex flex-col gap-[1.5rem] flex-1">
        <div className="flex items-center justify-between">
          <Link href="/start" className="label-eyebrow hover:text-ink">← Choose partner</Link>
          <span className="label-eyebrow">briefing</span>
        </div>
        <div className="card-product flex flex-col gap-6 max-w-[44rem]">
          <div className="flex items-center gap-4">
            <div className="w-[4.5rem] h-[4.5rem] shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-display text-[1.4rem]">
              {track!.avatar}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-[1.6rem]">{track!.persona}</h1>
                {grounded ? (
                  <span className="source-chip">★ cited</span>
                ) : (
                  <span className="label-eyebrow">delivery</span>
                )}
              </div>
              <p className="text-muted text-[0.9rem]">{track!.whoLine}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="label-eyebrow">The objective</span>
            <p className="text-[0.95rem]">{track!.tagline}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label-eyebrow">What they know</span>
            <p
              className="text-[0.9rem]"
              style={{ color: grounded ? "var(--verified)" : "var(--muted)" }}
            >
              {track!.knowledgeLine}
            </p>
            {grounded && track!.knows.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {track!.knows.map((c) => (
                  <Link key={c} href={`/study/${encodeURIComponent(c)}`} className="source-chip">
                    Review {c} prep →
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap border-t border-border pt-4">
            <button className="btn-primary" onClick={join}>
              Start the call →
            </button>
            <span className="text-muted text-[0.8rem]">
              {grounded
                ? "Voice. Bluff a fact and it lands in your debrief — with the source."
                : "Voice. Delivery practice, scored after the call."}
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-page py-[3rem] flex flex-col gap-[1.5rem] flex-1">
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">Greenroom · {track!.persona}</span>
        <span className="label-eyebrow">{phase === "live" ? "● live" : phase}</span>
      </div>

      <div className="grid gap-[1.5rem] md:grid-cols-[1.4fr_1fr] flex-1">
        {/* Interviewer "video" stage (static avatar + speaking state) */}
        <div className="card-product flex flex-col items-center justify-center gap-4 min-h-[24rem] relative">
          <div
            className="w-[8rem] h-[8rem] rounded-full bg-surface border border-border flex items-center justify-center font-display text-[2rem] transition-shadow"
            style={speaking ? { boxShadow: "0 0 0 0.4rem color-mix(in srgb, var(--ink) 8%, transparent)" } : undefined}
          >
            {track!.avatar}
          </div>
          <div className="text-center">
            <div className="font-display text-[1.2rem]">{track!.persona}</div>
            <div className="text-muted text-[0.85rem]">{track!.title}</div>
          </div>
          {phase === "connecting" && (
            <p className="text-muted text-[0.85rem]">
              {grounded ? "Loading your cited prep packs…" : "Connecting…"}
            </p>
          )}
          {phase === "debriefing" && (
            <p className="text-muted text-[0.85rem]">
              {grounded ? "Scoring your answers against the sources…" : "Reviewing your delivery…"}
            </p>
          )}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[0.85rem]" style={{ color: "var(--flag)" }}>{error}</p>
              {/* Demo insurance: if the live call won't connect, jump to the precomputed debrief. */}
              <Link href="/debrief/mock-stripe" className="btn-secondary">
                Show sample debrief →
              </Link>
            </div>
          )}
        </div>

        {/* Live transcript rail */}
        <div className="card-product overflow-auto max-h-[28rem]">
          <div className="label-eyebrow mb-3">
            {grounded ? "Live transcript · grounded in cited facts" : "Live transcript"}
          </div>
          {turns.length === 0 ? (
            <p className="text-muted text-[0.85rem]">The interviewer will speak first.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {turns.map((t, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="label-eyebrow">{t.role}</span>
                  <p className={t.role === "candidate" ? "fact-value" : "text-[0.9rem] text-muted"}>{t.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Call bar */}
      {(phase === "live" || phase === "connecting") && (
        <div className="card-product flex items-center justify-center gap-4">
          <button className="btn-secondary" onClick={toggleMute}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            className="btn-primary"
            style={{ background: "var(--flag)" }}
            onClick={endInterview}
          >
            End interview
          </button>
        </div>
      )}
    </main>
  );
}
