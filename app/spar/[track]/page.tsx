"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import Vapi from "@vapi-ai/web";
import { buildPersonaTrack, getTrack } from "@/lib/tracks";
import { Avatar } from "@/app/components/avatar";
import type { PersonaProfile, TranscriptTurn } from "@/lib/types";

type Phase = "idle" | "connecting" | "live" | "debriefing" | "error";

/** A cited topic the interviewer can probe, surfaced live (from /api/assistant). */
type LiveFact = { claim: string; target: string; sourceName?: string; sourceUrl: string };

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SparRoute({ params }: { params: Promise<{ track: string }> }) {
  return (
    <Suspense fallback={null}>
      <SparPage params={params} />
    </Suspense>
  );
}

function SparPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: trackId } = use(params);
  const searchParams = useSearchParams();
  const personaSlug = searchParams.get("persona") || undefined;
  const router = useRouter();

  // A distilled persona REPLACES the archetype but runs the base round (trackId). Load it
  // cache-only; until it arrives, fall back to the base track so the layout still renders.
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const baseTrack = getTrack(trackId);
  const track = persona ? buildPersonaTrack(persona) : baseTrack;

  const vapiRef = useRef<Vapi | null>(null);
  // Safety net: if we enter "connecting" and never reach "live" (no mic, network, Vapi
  // hiccup), this timer flips us to the error state instead of spinning forever.
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  // Guard so the debrief runs exactly once — whether the user hits "End interview" or the
  // call ends on its own (duration cap / interviewer wraps / Daily ejection).
  const endedRef = useRef(false);
  // Fresh transcript for the debrief: the call-end handler is registered once with a stale
  // `turns` closure, so it reads the latest turns from here instead.
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [facts, setFacts] = useState<LiveFact[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string>("");

  function clearConnectTimer() {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!personaSlug) return;
    let live = true;
    fetch(`/api/persona?slug=${encodeURIComponent(personaSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.profile) setPersona(d.profile as PersonaProfile);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [personaSlug]);

  useEffect(() => {
    return () => {
      clearConnectTimer();
      vapiRef.current?.stop();
    };
  }, []);

  // Daily (Vapi's WebRTC layer) throws "Meeting has ended" / ejection as an UNCAUGHT rejection
  // when a call closes normally. It's benign — we already handle call teardown via the SDK's
  // "call-end"/"error" events — but it trips Next's dev error overlay. Swallow just that one
  // message (capture phase + stopImmediatePropagation so we beat the overlay's own listener);
  // everything else still surfaces.
  useEffect(() => {
    const benign = /meeting (has )?ended|ejection|call (is |has )?(already )?ended/i;
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason as { message?: string } | string | undefined;
      const msg = String((reason as { message?: string })?.message ?? reason ?? "");
      if (benign.test(msg)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    window.addEventListener("unhandledrejection", onRejection, true);
    return () => window.removeEventListener("unhandledrejection", onRejection, true);
  }, []);

  // Tick an elapsed-time clock while the call is live (interviews are time-boxed).
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Keep the transcript pinned to the latest turn so new answers never hide below the fold.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  if (!baseTrack) notFound();

  async function join() {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set (Vapi key pending).");
      setPhase("error");
      return;
    }
    setPhase("connecting");
    setError("");
    // Fresh call: reset the once-only debrief guard and the "did we connect?" marker so a
    // retry after an error doesn't inherit the previous attempt's state.
    endedRef.current = false;
    startedAtRef.current = null;

    // Mic pre-check. A live voice call needs the microphone; if it's blocked or absent, Vapi
    // emits only device *warnings* and hangs on "connecting". Check up front so the candidate
    // gets a clear, actionable message instead of an indefinite spinner.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // release immediately; Vapi acquires its own
    } catch {
      setError(
        "Greenroom needs your microphone. Allow mic access in your browser — and on macOS, System Settings → Privacy → Microphone — then start the call again.",
      );
      setPhase("error");
      return;
    }

    try {
      // Persona drives an inline assistant (?persona=); plain rounds use ?track=.
      const assistantUrl = personaSlug
        ? `/api/assistant?persona=${encodeURIComponent(personaSlug)}`
        : `/api/assistant?track=${encodeURIComponent(track!.id)}`;
      const res = await fetch(assistantUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load assistant");
      setFacts(Array.isArray(data.facts) ? data.facts : []);

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      vapi.on("call-start", () => {
        clearConnectTimer();
        startedAtRef.current = Date.now();
        setPhase("live");
      });
      vapi.on("speech-start", () => setSpeaking(true));
      vapi.on("speech-end", () => setSpeaking(false));
      // The call closed (user ended, duration cap reached, or the interviewer wrapped up).
      // If we actually went live and haven't already started the debrief, run it now — never
      // leave the candidate stranded on a dead "live" screen.
      vapi.on("call-end", () => {
        clearConnectTimer();
        setSpeaking(false);
        if (endedRef.current || !startedAtRef.current) return; // user-ended, or never connected
        endedRef.current = true;
        runDebrief();
      });
      vapi.on("error", (e: unknown) => {
        // Vapi emits a structured object, not an Error — dig out the real message.
        clearConnectTimer();
        const err = e as { error?: { message?: string }; errorMsg?: string; message?: string; msg?: string };
        const detail =
          err?.error?.message ??
          err?.errorMsg ??
          err?.message ??
          err?.msg ??
          (typeof e === "string" ? e : JSON.stringify(e));
        // "Meeting has ended" / ejection is Daily's benign end-of-call signal, not a failure.
        // Route it like a normal call-end (debrief if we were live) instead of an error screen.
        if (/meeting (has )?ended|ejection|call (is |has )?(already )?ended/i.test(String(detail))) {
          if (startedAtRef.current && !endedRef.current) {
            endedRef.current = true;
            runDebrief();
          }
          return;
        }
        console.error("[vapi error]", e);
        setError(detail || "Vapi error (see console)");
        setPhase("error");
      });
      // Vapi emits a rolling `conversation-update` carrying the FULL deduplicated
      // conversation. Use it as the source of truth — rebuild turns each update.
      // (Raw `final` transcripts arrive one-per-pause and get dropped/reordered, which
      // splits one spoken answer into several broken bubbles and loses some entirely.)
      vapi.on("message", (msg: {
        type?: string;
        conversation?: { role?: string; content?: string }[];
      }) => {
        if (msg.type !== "conversation-update" || !Array.isArray(msg.conversation)) return;
        const next: TranscriptTurn[] = [];
        for (const m of msg.conversation) {
          const text = m.content?.trim();
          if (!text || (m.role !== "user" && m.role !== "assistant" && m.role !== "bot")) continue;
          const role: TranscriptTurn["role"] = m.role === "user" ? "candidate" : "interviewer";
          // Coalesce consecutive same-role fragments into one bubble so a single spoken
          // turn reads as one paragraph instead of several broken lines.
          const last = next[next.length - 1];
          if (last && last.role === role) last.text = `${last.text} ${text}`;
          else next.push({ role, text });
        }
        turnsRef.current = next;
        setTurns(next);
      });
      // Arm the safety net before starting: if "call-start" never fires within 15s, bail to the
      // error state (with the sample-debrief fallback) instead of spinning on "connecting".
      clearConnectTimer();
      connectTimerRef.current = setTimeout(() => {
        connectTimerRef.current = null;
        vapiRef.current?.stop();
        setError(
          "The call didn't connect — usually a microphone or network issue. Try again, or see a sample debrief below.",
        );
        setPhase("error");
      }, 15000);

      // Prefer the persistent dashboard assistant (npm run sync:vapi); fall back to the inline
      // config so the call still works before any sync / as venue insurance.
      await vapi.start(data.assistantId ?? data.assistant);
    } catch (e) {
      clearConnectTimer();
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

  // Score the call and hand off to the debrief. Called once per call — either from the
  // "End interview" button or automatically when the call ends on its own. Reads the latest
  // transcript from turnsRef (the call-end handler's `turns` closure is stale).
  async function runDebrief() {
    setPhase("debriefing");
    const transcript = turnsRef.current;
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: track!.id, transcript }),
      });
      const debrief = await res.json();
      if (!res.ok) throw new Error(debrief.error ?? "Debrief failed");
      sessionStorage.setItem(
        "greenroom:debrief",
        JSON.stringify({ label: track!.title, grounded: track!.grounded, transcript, debrief }),
      );
      router.push("/debrief/live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Debrief failed");
      setPhase("error");
    }
  }

  function endInterview() {
    if (endedRef.current) return; // already ending (e.g. call-end fired first)
    endedRef.current = true;
    clearConnectTimer();
    vapiRef.current?.stop(); // fires "call-end", but endedRef guards re-entry
    runDebrief();
  }

  const grounded = track!.grounded;

  // Briefing (pre-call). Citations can't show mid-call (it's audio), so make the persona,
  // objective, and CITED knowledge visible HERE — grounding bookends the experience
  // (prep → call → debrief). "Start the call" runs join().
  if (phase === "idle") {
    return (
      <main className="container-page max-w-[44rem] py-[3rem] flex flex-col gap-[1.5rem] flex-1">
        <div className="flex items-center justify-between reveal">
          <Link href={persona ? "/persona" : "/start"} className="label-eyebrow hover:text-ink transition-colors">
            ← {persona ? "Distilled people" : "Choose partner"}
          </Link>
          <span className="pill">briefing</span>
        </div>
        <div className={`card-product card-grounded flex flex-col gap-6 max-w-[44rem] reveal ${grounded ? "" : "!bg-surface-product !border-border"}`}>
          <div className="flex items-center gap-4">
            <Avatar
              src={track!.portrait}
              initials={track!.avatar}
              accent={grounded}
              className="w-[4.5rem] h-[4.5rem] shrink-0 text-[1.4rem]"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-[1.6rem]">{track!.name}</h1>
                {persona ? (
                  <span className="source-chip">◆ distilled · {persona.sources.length} sources</span>
                ) : grounded ? (
                  <span className="source-chip">★ cited</span>
                ) : (
                  <span className="pill">delivery</span>
                )}
              </div>
              <p className="text-[0.82rem] text-ink/70">{track!.role}</p>
              <p className="text-muted text-[0.9rem]">{track!.whoLine}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="label-eyebrow">{persona ? "What they're evaluating" : "The objective"}</span>
            <p className="text-[0.95rem]">{track!.tagline}</p>
          </div>

          {persona && (
            <div className="flex flex-col gap-3 border border-border rounded-[0.6rem] p-4 bg-surface/40">
              <div className="flex items-center justify-between gap-2">
                <span className="label-eyebrow">How they interview</span>
                <Link href={`/persona/${encodeURIComponent(persona.slug)}`} className="label-eyebrow hover:text-ink">
                  Full dossier →
                </Link>
              </div>
              {persona.style.petTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {persona.style.petTopics.slice(0, 5).map((t) => (
                    <span key={t} className="source-chip">{t}</span>
                  ))}
                </div>
              )}
              {persona.quotes[0] && (
                <a
                  href={persona.quotes[0].sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.85rem] italic text-muted hover:text-ink border-l-2 border-border pl-3"
                >
                  “{persona.quotes[0].text}”
                </a>
              )}
            </div>
          )}

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
            <button className={grounded ? "btn-accent" : "btn-primary"} onClick={join}>
              Start the call →
            </button>
            <span className="text-muted text-[0.8rem] max-w-[20rem]">
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
    <main className="container-page py-[2rem] flex flex-col gap-[1.25rem] flex-1">
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">Greenroom · {track!.name}</span>
        {phase === "live" ? (
          <span className="badge-live">live · {mmss(elapsed)}</span>
        ) : (
          <span className="pill">{phase}</span>
        )}
      </div>

      <div className="grid gap-[1.5rem] md:grid-cols-[1.45fr_1fr] flex-1">
        {/* Interviewer "video" stage (avatar + speaking state + live facts rail) */}
        <div className="card-product flex flex-col gap-4 min-h-[26rem] relative overflow-hidden">
          {/* Faint ambient wash so the call surface reads as a "stage", not a flat box. */}
          <div
            className="absolute inset-0 -z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 38%, color-mix(in srgb, var(--verified) 7%, transparent), transparent 70%)",
            }}
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-5 relative">
            {/* Speaking orb — concentric rings ripple while the interviewer talks. */}
            <div className="relative w-[8.5rem] h-[8.5rem]">
              {phase === "live" && speaking && (
                <>
                  <span className="orb-ring" />
                  <span className="orb-ring" style={{ animationDelay: "0.8s" }} />
                  <span className="orb-ring" style={{ animationDelay: "1.6s" }} />
                </>
              )}
              <div
                className={`absolute inset-0 rounded-full overflow-hidden flex items-center justify-center font-display text-[2.1rem] shadow-md ${
                  grounded ? "avatar-accent" : "avatar-ink"
                }`}
                style={
                  phase === "live" && speaking
                    ? { animation: "orb-breathe 2.4s ease-in-out infinite" }
                    : undefined
                }
              >
                {track!.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track!.portrait} alt="" className="w-full h-full object-cover" />
                ) : (
                  track!.avatar
                )}
              </div>
            </div>
            <div className="text-center relative">
              <div className="font-display text-[1.3rem]">{track!.name}</div>
              <div className="text-muted text-[0.85rem] mt-0.5 inline-flex items-center gap-1.5">
                {phase === "live" && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: speaking ? "var(--verified)" : "var(--border-strong)" }}
                  />
                )}
                {phase === "live" ? (speaking ? "Speaking…" : "Listening…") : track!.title}
              </div>
            </div>
            {phase === "connecting" && (
              <p className="badge-live text-[0.85rem]">
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

          {/* Facts in play — the cited topics the interviewer can probe, visible mid-call.
              Bluff one and it surfaces in the debrief with its source. */}
          {grounded && facts.length > 0 && (phase === "live" || phase === "connecting") && (
            <div className="border-t border-border pt-4">
              <div className="label-eyebrow mb-2">
                Facts in play · grounded in {facts.length} cited facts
              </div>
              <div className="flex flex-wrap gap-2">
                {facts.slice(0, 12).map((f, i) => (
                  <a
                    key={`${f.target}-${f.claim}-${i}`}
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-chip"
                    title={f.sourceName ? `${f.target} · source: ${f.sourceName}` : f.target}
                  >
                    {f.target} · {f.claim}
                  </a>
                ))}
                {facts.length > 12 && (
                  <span className="label-eyebrow self-center">+{facts.length - 12} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live transcript rail */}
        <div ref={transcriptRef} className="card-product overflow-auto max-h-[28rem]">
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
        <div className="card-product flex items-center justify-center gap-3 py-3">
          <button
            className={`inline-flex items-center gap-2 rounded-[0.7rem] px-4 py-2.5 text-[0.9rem] font-medium border transition-all ${
              muted
                ? "bg-surface text-ink border-border-strong"
                : "bg-canvas text-ink border-border hover:border-ink"
            }`}
            onClick={toggleMute}
          >
            <span aria-hidden>{muted ? "🔇" : "🎙"}</span>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-[0.7rem] px-5 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_6px_20px_rgba(210,59,59,0.3)] transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #e04545 0%, #c62828 100%)" }}
            onClick={endInterview}
          >
            <span aria-hidden>■</span>
            End interview
          </button>
        </div>
      )}
    </main>
  );
}
