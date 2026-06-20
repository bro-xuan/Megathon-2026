"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Vapi from "@vapi-ai/web";
import type { TranscriptTurn } from "@/lib/types";

type Phase = "idle" | "connecting" | "live" | "debriefing" | "error";

export default function SparPage({ params }: { params: Promise<{ target: string }> }) {
  const { target: rawTarget } = use(params);
  const target = decodeURIComponent(rawTarget);
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

  async function join() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set (Vapi key pending).");
      setPhase("error");
      return;
    }
    setPhase("connecting");
    try {
      const res = await fetch(`/api/assistant?target=${encodeURIComponent(target)}`);
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
        body: JSON.stringify({ target, transcript: turns }),
      });
      const debrief = await res.json();
      if (!res.ok) throw new Error(debrief.error ?? "Debrief failed");
      sessionStorage.setItem("greenroom:debrief", JSON.stringify({ target, transcript: turns, debrief }));
      router.push("/debrief/live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debrief failed");
      setPhase("error");
    }
  }

  return (
    <main className="container-page py-[3rem] flex flex-col gap-[1.5rem] flex-1">
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">Greenroom · {target} interview</span>
        <span className="label-eyebrow">{phase === "live" ? "● live" : phase}</span>
      </div>

      <div className="grid gap-[1.5rem] md:grid-cols-[1.4fr_1fr] flex-1">
        {/* Interviewer "video" stage (static image + speaking state) */}
        <div className="card-product flex flex-col items-center justify-center gap-4 min-h-[24rem] relative">
          <div
            className="w-[8rem] h-[8rem] rounded-full bg-surface border border-border flex items-center justify-center font-display text-[2rem] transition-shadow"
            style={speaking ? { boxShadow: "0 0 0 0.4rem color-mix(in srgb, var(--ink) 8%, transparent)" } : undefined}
          >
            MD
          </div>
          <div className="text-center">
            <div className="font-display text-[1.2rem]">Interviewer</div>
            <div className="text-muted text-[0.85rem]">Managing Director · {target} coverage</div>
          </div>
          {phase === "idle" && (
            <button className="btn-primary mt-2" onClick={join}>
              Join interview →
            </button>
          )}
          {phase === "connecting" && <p className="text-muted text-[0.85rem]">Querying Cala.ai for {target}&apos;s entity network…</p>}
          {phase === "debriefing" && <p className="text-muted text-[0.85rem]">Scoring your answers against the sources…</p>}
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
          <div className="label-eyebrow mb-3">Live transcript · grounded in cited facts</div>
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
