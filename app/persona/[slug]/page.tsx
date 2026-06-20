// Persona dossier — the human-readable scouting report on a distilled interviewer. Server
// component: reads the cached profile straight from data/personas/*. "Start the call" hands off
// to the spar page with ?persona=<slug>, which runs the base round in this person's voice.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersona } from "@/lib/persona";
import { getTrack } from "@/lib/tracks";
import { VoicePreview } from "@/app/components/voice-preview";

export default async function PersonaDossier({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPersona(slug);
  if (!p) notFound();

  const round = getTrack(p.baseTrack);
  const firstName = p.name.split(" ")[0];
  const sparHref = `/spar/${encodeURIComponent(p.baseTrack)}?persona=${encodeURIComponent(p.slug)}`;

  // A dossier card that packs tight in the masonry (no row-stretch gaps).
  function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
    return (
      <div className="card-product break-inside-avoid mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label-eyebrow">{title}</span>
          {aside}
        </div>
        {children}
      </div>
    );
  }

  function List({ items }: { items: string[] }) {
    if (!items.length) return <p className="text-muted text-[0.85rem]">—</p>;
    return (
      <ul className="flex flex-col gap-1.5">
        {items.map((x, i) => (
          <li key={i} className="text-[0.88rem] leading-snug">{x}</li>
        ))}
      </ul>
    );
  }

  return (
    <main className="container-page py-[2.5rem] flex flex-col gap-7 flex-1">
      <div className="flex items-center justify-between">
        <Link href="/persona" className="label-eyebrow hover:text-ink">← Distilled people</Link>
        <span className="label-eyebrow">dossier</span>
      </div>

      {/* Masthead — identity on the left, the call CTA pinned right so the row fills the width. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between reveal">
        <div className="flex items-start gap-4 max-w-[42rem]">
          <div className="w-[4rem] h-[4rem] shrink-0 rounded-full avatar-accent flex items-center justify-center font-display text-[1.3rem] shadow-md">
            {p.avatar}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-[1.7rem] leading-tight">{p.name}</h1>
              <span className="source-chip">◆ distilled · {p.sources.length} sources</span>
            </div>
            <p className="text-[0.88rem] text-ink/70">{p.role}</p>
            <p className="text-muted text-[0.96rem] leading-relaxed mt-0.5">{p.headline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 lg:items-end">
          <Link href={sparHref} className="btn-accent">Start the call →</Link>
          <span className="text-muted text-[0.76rem] max-w-[15rem] lg:text-right">
            Runs the {round?.title ?? p.baseTrack} round — in {firstName}&apos;s voice, grounded in cited facts.
          </span>
        </div>
      </div>

      {/* Dossier cards — masonry so variable-height cards pack tight with no stretched gaps. */}
      <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
        <Card title="What they're evaluating">
          <p className="text-[0.9rem] leading-snug">{p.objective}</p>
        </Card>

        <Card
          title="Opening line"
          aside={<VoicePreview text={p.firstMessage} name={p.name} seed={p.slug} />}
        >
          <p className="text-[0.9rem] italic leading-snug">“{p.firstMessage}”</p>
        </Card>

        <Card title="Tone">
          <p className="text-[0.88rem] leading-snug">{p.style.tone}</p>
        </Card>

        <Card title="Cadence">
          <p className="text-[0.88rem] leading-snug">{p.style.cadence}</p>
        </Card>

        <Card title="Pet topics">
          <div className="flex flex-wrap gap-1.5">
            {p.style.petTopics.length
              ? p.style.petTopics.map((t) => <span key={t} className="source-chip">{t}</span>)
              : <span className="text-muted text-[0.85rem]">—</span>}
          </div>
        </Card>

        <Card title="Signature phrases">
          <List items={p.style.signaturePhrases} />
        </Card>

        <Card title="How they catch a weak answer">
          <List items={p.style.tells} />
        </Card>
      </div>

      {/* Cited verbatim voice — masonry of quote cards. */}
      {p.quotes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[1.15rem]">In their own words <span className="text-muted text-[0.78rem] font-normal">· cited</span></h2>
          <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
            {p.quotes.map((q, i) => (
              <a
                key={i}
                href={q.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="card-product card-interactive break-inside-avoid mb-4 block border-l-[3px]"
                style={{ borderLeftColor: "color-mix(in srgb, var(--verified) 40%, transparent)" }}
              >
                <p className="text-[0.9rem] italic leading-snug">“{q.text}”</p>
                <p className="text-muted text-[0.74rem] mt-2">
                  {q.context ? q.context + " · " : ""}{q.sourceName ?? q.sourceUrl} →
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Cited knowledge — two-column dense list. */}
      {p.knowledge.facts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[1.15rem]">Cited background</h2>
          {/* Labels come from the company-oriented classifier, so we show value + source only. */}
          <ul className="columns-1 md:columns-2 gap-x-8">
            {p.knowledge.facts.map((f, i) => (
              <li key={i} className="text-[0.88rem] leading-snug break-inside-avoid mb-2.5">
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
        AI approximation for interview practice. Voice and style are reconstructed from public
        material — this is a synthetic soundalike, not a recording or voice clone of the actual
        person. Distilled {new Date(p.distilledAt).toLocaleDateString()}.
      </p>
    </main>
  );
}
