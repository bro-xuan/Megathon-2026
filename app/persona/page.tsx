// Index of distilled people — the real interviewers you can face. Server component reading the
// data/personas/* cache. Empty state explains how to distill one (`npm run distill`).

import Link from "next/link";
import { listPersonas } from "@/lib/persona";
import { getTrack } from "@/lib/tracks";

export default async function PersonaIndex() {
  const personas = await listPersonas();

  return (
    <main className="flex-1 flex flex-col">
      <section className="hero-aura border-b border-border">
        <div className="container-page py-[3.5rem] flex flex-col gap-4 max-w-[48rem] reveal">
          <Link href="/start" className="label-eyebrow hover:text-ink w-fit transition-colors">← Choose partner</Link>
          <span className="label-eyebrow">Distilled people</span>
          <h1 className="font-display text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.04]">
            Know exactly who you&apos;re facing
          </h1>
          <p className="text-muted text-[1.02rem] max-w-[44rem] leading-relaxed">
            A final round isn&apos;t a generic archetype — it&apos;s a specific person. Greenroom{" "}
            <strong className="text-ink">distills a real interviewer</strong> from their public
            traces: their cited knowledge, their objective, and how they actually talk. Then you
            spar with <em>them</em>.
          </p>
          <Link href="/persona/new" className="btn-accent w-fit mt-1">+ Distill someone new</Link>
        </div>
      </section>

      <div className="container-page py-[3rem]">
      {personas.length > 0 ? (
        <section className="grid gap-[1.25rem] sm:grid-cols-2 max-w-[52rem]">
          {personas.map((p, i) => {
            const round = getTrack(p.baseTrack);
            return (
              <Link
                key={p.slug}
                href={`/persona/${encodeURIComponent(p.slug)}`}
                className="card-product card-grounded card-interactive group flex flex-col gap-3.5 reveal"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-[2.8rem] h-[2.8rem] shrink-0 rounded-full avatar-accent flex items-center justify-center font-display text-[0.9rem] shadow-sm">
                      {p.avatar}
                    </span>
                    <div className="flex flex-col">
                      <h2 className="font-display text-[1.2rem] leading-tight">{p.name}</h2>
                      <span className="text-muted text-[0.78rem]">{p.role}</span>
                    </div>
                  </div>
                  <span className="source-chip shrink-0">◆ distilled</span>
                </div>
                <p className="text-muted text-[0.9rem] flex-1 leading-relaxed">{p.headline}</p>
                <div className="text-[0.78rem] font-medium" style={{ color: "var(--verified-deep)" }}>
                  {round?.title ?? p.baseTrack} · {p.sources.length} sources · {p.quotes.length} cited quotes
                </div>
                <span className="text-ink text-[0.85rem] font-semibold inline-flex items-center gap-1 transition-all group-hover:gap-2">
                  Open dossier →
                </span>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="card-product max-w-[40rem] flex flex-col gap-3">
          <span className="label-eyebrow">No personas yet</span>
          <p className="text-muted text-[0.9rem]">
            Distill your first interviewer — name them and (optionally) paste links to how they
            talk.
          </p>
          <Link href="/persona/new" className="btn-accent w-fit">+ Distill someone new</Link>
          <p className="text-muted text-[0.8rem]">
            Prefer the terminal? <code className="fact-value text-[0.78rem] bg-surface px-1.5 py-0.5 rounded">npm run distill -- &quot;Aswath Damodaran&quot; markets</code>
          </p>
        </section>
      )}
      </div>
    </main>
  );
}
