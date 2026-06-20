"use client";

// Distill a persona interactively: name a person, pick the voice they'll speak in, and optionally
// paste YouTube / X / article links to ground their voice in their own cited words. No links? The
// name alone still works — we distill from public knowledge (Cala) and the model's read of them.

import { useState } from "react";
import Link from "next/link";
import { GROUNDED_TRACKS } from "@/lib/tracks";
import { VoicePreview } from "@/app/components/voice-preview";
import { VoicePicker } from "@/app/components/voice-picker";
import { elevenVoiceName } from "@/lib/voice";
import type { PersonaProfile } from "@/lib/types";

type FetchLog = { url: string; kind: "youtube" | "linkedin" | "article"; ok: boolean; chars: number; note: string };

function linkKind(url: string): "youtube" | "linkedin" | "article" | "" {
  const u = url.trim();
  if (!u) return "";
  if (/youtube\.com|youtu\.be/i.test(u)) return "youtube";
  if (/linkedin\.com/i.test(u)) return "linkedin";
  if (/^https?:\/\//i.test(u)) return "article";
  return "";
}

const KIND_LABEL: Record<string, string> = { youtube: "YouTube", linkedin: "LinkedIn", article: "Article" };

const inputClass =
  "bg-surface border border-border rounded-[0.6rem] px-3.5 py-2.5 text-[0.95rem] focus:outline-none focus:border-verified focus:ring-2 focus:ring-[color-mix(in_srgb,var(--verified)_18%,transparent)] transition-shadow";

export default function NewPersonaPage() {
  const [name, setName] = useState("");
  const [baseTrack, setBaseTrack] = useState<string>(GROUNDED_TRACKS[0]?.id ?? "markets");
  const [voiceId, setVoiceId] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ profile: PersonaProfile; fetchLog: FetchLog[] } | null>(null);

  function setLink(i: number, v: string) {
    setLinks((prev) => prev.map((l, j) => (j === i ? v : l)));
  }
  function addLink() {
    setLinks((prev) => [...prev, ""]);
  }
  function removeLink(i: number) {
    setLinks((prev) => (prev.length === 1 ? [""] : prev.filter((_, j) => j !== i)));
  }

  async function distill() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter the person's name.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/persona/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          baseTrack,
          voiceId: voiceId || undefined,
          links: links.map((l) => l.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Distillation failed");
      setResult(data as { profile: PersonaProfile; fetchLog: FetchLog[] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Distillation failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Success view ──
  if (result) {
    const p = result.profile;
    const read = result.fetchLog.filter((l) => l.ok).length;
    const vname = elevenVoiceName(p.voiceId);
    return (
      <main className="container-page py-[3rem] flex flex-col gap-[1.5rem] flex-1">
        <div className="flex items-center justify-between">
          <Link href="/persona" className="label-eyebrow hover:text-ink">← Distilled people</Link>
          <span className="label-eyebrow">distilled</span>
        </div>
        <div className="card-product card-grounded flex flex-col gap-5 w-full max-w-[46rem] reveal">
          <div className="flex items-center gap-4">
            <div className="w-[4rem] h-[4rem] shrink-0 rounded-full avatar-accent flex items-center justify-center font-display text-[1.3rem] shadow-md">
              {p.avatar}
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="font-display text-[1.5rem]">{p.name}</h1>
              <p className="text-[0.82rem] text-ink/70">{p.role}</p>
            </div>
            <div className="ml-auto self-center">
              <VoicePreview text={p.firstMessage} name={p.name} seed={p.slug} />
            </div>
          </div>
          <p className="text-muted text-[0.9rem]">{p.headline}</p>
          <div className="flex flex-wrap gap-2 text-[0.8rem]">
            {vname && <span className="source-chip">♪ voice: {vname}</span>}
            <span className="source-chip">{p.quotes.length} cited quotes</span>
            <span className="source-chip">{p.knowledge.facts.length} cited facts</span>
            <span className="source-chip">{p.sources.length} sources</span>
            {result.fetchLog.length > 0 && (
              <span className="source-chip">{read}/{result.fetchLog.length} links read</span>
            )}
          </div>

          {result.fetchLog.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-border pt-4">
              <span className="label-eyebrow">What we read</span>
              {result.fetchLog.map((l) => (
                <div key={l.url} className="flex items-center gap-2 text-[0.82rem]">
                  <span style={{ color: l.ok ? "var(--verified)" : "var(--flag)" }}>{l.ok ? "✓" : "✗"}</span>
                  <span className="label-eyebrow shrink-0">{KIND_LABEL[l.kind]}</span>
                  <span className="text-muted truncate flex-1">{l.url}</span>
                  <span className="text-muted shrink-0">{l.ok ? `${l.chars.toLocaleString()} chars · ${l.note}` : l.note}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap border-t border-border pt-4">
            <Link href={`/spar/${encodeURIComponent(p.baseTrack)}?persona=${encodeURIComponent(p.slug)}`} className="btn-accent">
              Start the call →
            </Link>
            <Link href={`/persona/${encodeURIComponent(p.slug)}`} className="btn-secondary">Open dossier →</Link>
            <button className="label-eyebrow hover:text-ink" onClick={() => setResult(null)}>Distill another</button>
          </div>
        </div>
      </main>
    );
  }

  // ── Form view ──
  return (
    <main className="container-page py-[3rem] flex flex-col gap-[2rem] flex-1">
      <div className="flex items-center justify-between">
        <Link href="/persona" className="label-eyebrow hover:text-ink">← Distilled people</Link>
        <span className="label-eyebrow">new persona</span>
      </div>

      <header className="flex flex-col gap-3 max-w-[46rem]">
        <span className="label-eyebrow">New persona</span>
        <h1 className="font-display text-[clamp(2rem,3.8vw,2.9rem)] leading-[1.05]">Distill your interviewer</h1>
        <p className="text-muted text-[1rem] leading-relaxed max-w-[42rem]">
          Name the person you&apos;ll face, choose how they sound, and drop links to how they
          actually talk. We pull cited facts, reconstruct their style, and hand you a sparring
          partner — voice and all.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] items-start">
        {/* Left — who & what */}
        <div className="card-product flex flex-col gap-6">
          <label className="flex flex-col gap-1.5">
            <span className="label-eyebrow">Who are you facing?</span>
            <input
              className={inputClass}
              placeholder="e.g. Aswath Damodaran"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-eyebrow">What round do they run?</span>
            <select
              className={inputClass}
              value={baseTrack}
              onChange={(e) => setBaseTrack(e.target.value)}
              disabled={busy}
            >
              {GROUNDED_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>{t.title} — {t.tagline.slice(0, 56)}…</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="label-eyebrow">
              Their public voice{" "}
              <span className="text-muted normal-case font-normal">(optional — YouTube, LinkedIn, articles)</span>
            </span>
            {links.map((l, i) => {
              const kind = linkKind(l);
              return (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`flex-1 ${inputClass} text-[0.88rem] py-2`}
                    placeholder="https://…"
                    value={l}
                    onChange={(e) => setLink(i, e.target.value)}
                    disabled={busy}
                  />
                  {kind && <span className="source-chip shrink-0">{KIND_LABEL[kind]}</span>}
                  <button
                    type="button"
                    className="text-muted hover:text-ink shrink-0 px-1.5 text-[0.9rem]"
                    onClick={() => removeLink(i)}
                    disabled={busy}
                    aria-label="Remove link"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button type="button" className="label-eyebrow hover:text-ink w-fit" onClick={addLink} disabled={busy}>
              + Add source
            </button>
          </div>
        </div>

        {/* Right — voice */}
        <div className="card-product flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="label-eyebrow">Their voice</span>
            <span className="text-muted text-[0.82rem]">Tap ▶ to audition. Auto picks a fitting one.</span>
          </div>
          <VoicePicker value={voiceId} onChange={setVoiceId} disabled={busy} />
        </div>
      </div>

      {error && <p className="text-[0.85rem]" style={{ color: "var(--flag)" }}>{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-accent disabled:opacity-60" onClick={distill} disabled={busy}>
          {busy ? "Distilling…" : "Distill persona →"}
        </button>
        <span className="text-muted text-[0.82rem]">
          {busy
            ? "Reading sources, searching Cala for cited facts, synthesizing their voice — ~20-40s."
            : "Reads your links, pulls cited facts, and writes a dossier you can spar against."}
        </span>
      </div>
    </main>
  );
}
