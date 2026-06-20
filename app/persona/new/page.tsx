"use client";

// Distill a persona interactively: name a person, optionally paste YouTube / X / article links to
// ground their voice in their own words, and we build the cited dossier. No links? The name alone
// still works — we distill from public knowledge (Cala) and the model's read of their reputation.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GROUNDED_TRACKS } from "@/lib/tracks";
import { VoicePreview } from "@/app/components/voice-preview";
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

export default function NewPersonaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [baseTrack, setBaseTrack] = useState<string>(GROUNDED_TRACKS[0]?.id ?? "markets");
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
    return (
      <main className="container-page py-[3rem] flex flex-col gap-[1.5rem] flex-1">
        <div className="flex items-center justify-between">
          <Link href="/persona" className="label-eyebrow hover:text-ink">← Distilled people</Link>
          <span className="label-eyebrow">distilled</span>
        </div>
        <div className="card-product card-grounded flex flex-col gap-5 max-w-[44rem] reveal">
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
    <main className="container-page py-[3rem] flex flex-col gap-[1.75rem] flex-1">
      <div className="flex items-center justify-between">
        <Link href="/persona" className="label-eyebrow hover:text-ink">← Distilled people</Link>
        <span className="label-eyebrow">new persona</span>
      </div>

      <header className="flex flex-col gap-2 max-w-[44rem]">
        <span className="label-eyebrow">New persona</span>
        <h1 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.1]">Distill your interviewer</h1>
        <p className="text-muted text-[0.95rem]">
          Name the person you&apos;ll face. Add links to how they actually talk — talks, posts,
          articles — and we ground their voice in their own cited words. No links? Just the name
          works; we distill from public knowledge.
        </p>
      </header>

      <div className="card-product flex flex-col gap-6 max-w-[44rem]">
        {/* Name */}
        <label className="flex flex-col gap-1.5">
          <span className="label-eyebrow">Who are you facing?</span>
          <input
            className="bg-surface border border-border rounded-[0.5rem] px-3 py-2 text-[1rem] focus:outline-none focus:border-verified focus:ring-2 focus:ring-[color-mix(in_srgb,var(--verified)_18%,transparent)]"
            placeholder="e.g. Taylor Wright"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </label>

        {/* Round */}
        <label className="flex flex-col gap-1.5">
          <span className="label-eyebrow">What round do they run?</span>
          <select
            className="bg-surface border border-border rounded-[0.5rem] px-3 py-2 text-[0.95rem] focus:outline-none focus:border-verified focus:ring-2 focus:ring-[color-mix(in_srgb,var(--verified)_18%,transparent)]"
            value={baseTrack}
            onChange={(e) => setBaseTrack(e.target.value)}
            disabled={busy}
          >
            {GROUNDED_TRACKS.map((t) => (
              <option key={t.id} value={t.id}>{t.title} — {t.tagline.slice(0, 60)}…</option>
            ))}
          </select>
        </label>

        {/* Source links */}
        <div className="flex flex-col gap-2">
          <span className="label-eyebrow">Their public voice <span className="text-muted normal-case">(optional — YouTube, LinkedIn, articles)</span></span>
          {links.map((l, i) => {
            const kind = linkKind(l);
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 bg-surface border border-border rounded-[0.5rem] px-3 py-2 text-[0.9rem] focus:outline-none focus:border-verified focus:ring-2 focus:ring-[color-mix(in_srgb,var(--verified)_18%,transparent)]"
                  placeholder="https://…"
                  value={l}
                  onChange={(e) => setLink(i, e.target.value)}
                  disabled={busy}
                />
                {kind && <span className="source-chip shrink-0">{KIND_LABEL[kind]}</span>}
                <button
                  type="button"
                  className="label-eyebrow hover:text-ink shrink-0 px-1"
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

        {error && <p className="text-[0.85rem]" style={{ color: "var(--flag)" }}>{error}</p>}

        <div className="flex items-center gap-3 flex-wrap border-t border-border pt-4">
          <button className="btn-accent disabled:opacity-60" onClick={distill} disabled={busy}>
            {busy ? "Distilling…" : "Distill persona →"}
          </button>
          <span className="text-muted text-[0.8rem]">
            {busy
              ? "Reading sources, searching Cala for cited facts, synthesizing their voice — ~20-40s."
              : "Reads your links, pulls cited facts, and writes a dossier + MD file."}
          </span>
        </div>
      </div>
    </main>
  );
}
