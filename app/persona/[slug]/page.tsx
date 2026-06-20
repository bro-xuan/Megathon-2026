// Persona dossier — the human-readable scouting report on a distilled interviewer. Server
// component: reads the cached profile straight from data/personas/*. "Start the call" hands off
// to the spar page with ?persona=<slug>, which runs the base round in this person's voice.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersona } from "@/lib/persona";
import { getTrack } from "@/lib/tracks";

export default async function PersonaDossier({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPersona(slug);
  if (!p) notFound();

  const round = getTrack(p.baseTrack);
  const sparHref = `/spar/${encodeURIComponent(p.baseTrack)}?persona=${encodeURIComponent(p.slug)}`;

  function List({ items }: { items: string[] }) {
    if (!items.length) return <p className="text-muted text-[0.85rem]">—</p>;
    return (
      <ul className="flex flex-col gap-1.5">
        {items.map((x, i) => (
          <li key={i} className="text-[0.9rem]">{x}</li>
        ))}
      </ul>
    );
  }

  return (
    <main className="container-page py-[3rem] flex flex-col gap-[1.75rem] flex-1">
      <div className="flex items-center justify-between">
        <Link href="/persona" className="label-eyebrow hover:text-ink">← Distilled people</Link>
        <span className="label-eyebrow">dossier</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 max-w-[48rem]">
        <div className="w-[4.5rem] h-[4.5rem] shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-display text-[1.4rem]">
          {p.avatar}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-[1.8rem] leading-tight">{p.name}</h1>
            <span className="source-chip">◆ distilled · {p.sources.length} sources</span>
          </div>
          <p className="text-[0.9rem] text-ink/70">{p.role}</p>
        </div>
      </div>
      <p className="text-muted text-[1rem] max-w-[44rem]">{p.headline}</p>

      <div className="flex items-center gap-3 flex-wrap">
        <Link href={sparHref} className="btn-primary">Start the call →</Link>
        <span className="text-muted text-[0.8rem]">
          Runs the {round?.title ?? p.baseTrack} round — in {p.name.split(" ")[0]}&apos;s voice, grounded in cited facts.
        </span>
      </div>

      <div className="grid gap-[1.5rem] md:grid-cols-2 max-w-[52rem]">
        {/* Objective + opening */}
        <div className="card-product flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="label-eyebrow">What they&apos;re evaluating</span>
            <p className="text-[0.92rem]">{p.objective}</p>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <span className="label-eyebrow">Opening line</span>
            <p className="text-[0.92rem] italic">“{p.firstMessage}”</p>
          </div>
        </div>

        {/* Voice & style */}
        <div className="card-product flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="label-eyebrow">Tone</span>
            <p className="text-[0.9rem]">{p.style.tone}</p>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <span className="label-eyebrow">Cadence</span>
            <p className="text-[0.9rem]">{p.style.cadence}</p>
          </div>
        </div>

        <div className="card-product flex flex-col gap-2">
          <span className="label-eyebrow">Pet topics</span>
          <div className="flex flex-wrap gap-2">
            {p.style.petTopics.length
              ? p.style.petTopics.map((t) => <span key={t} className="source-chip">{t}</span>)
              : <span className="text-muted text-[0.85rem]">—</span>}
          </div>
          <span className="label-eyebrow mt-3">Signature phrases</span>
          <List items={p.style.signaturePhrases} />
        </div>

        <div className="card-product flex flex-col gap-2">
          <span className="label-eyebrow">How they catch a weak answer</span>
          <List items={p.style.tells} />
        </div>
      </div>

      {/* Cited verbatim voice */}
      {p.quotes.length > 0 && (
        <section className="flex flex-col gap-3 max-w-[52rem]">
          <h2 className="font-display text-[1.2rem]">In their own words <span className="text-muted text-[0.8rem] font-normal">· cited</span></h2>
          <div className="flex flex-col gap-3">
            {p.quotes.map((q, i) => (
              <a
                key={i}
                href={q.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="card-product block hover:border-ink/30 transition-colors"
              >
                <p className="text-[0.95rem] italic">“{q.text}”</p>
                <p className="text-muted text-[0.78rem] mt-2">
                  {q.context ? q.context + " · " : ""}{q.sourceName ?? q.sourceUrl} →
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Cited knowledge */}
      {p.knowledge.facts.length > 0 && (
        <section className="flex flex-col gap-3 max-w-[52rem]">
          <h2 className="font-display text-[1.2rem]">Cited background</h2>
          {/* Labels come from the company-oriented classifier, so we show value + source only. */}
          <ul className="flex flex-col gap-2">
            {p.knowledge.facts.map((f, i) => (
              <li key={i} className="text-[0.9rem]">
                {f.value}{" "}
                <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="source-chip ml-1">
                  {f.sourceName ?? "source"} →
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-muted text-[0.75rem] max-w-[44rem] border-t border-border pt-4">
        Style is an approximation reconstructed from public material — not the actual person.
        Distilled {new Date(p.distilledAt).toLocaleDateString()}.
      </p>
    </main>
  );
}
