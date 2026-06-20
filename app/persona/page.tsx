// Index of distilled people — the real interviewers you can face. Server component reading the
// data/personas/* cache. Empty state explains how to distill one (`npm run distill`).

import Link from "next/link";
import { listPersonas } from "@/lib/persona";
import { getTrack } from "@/lib/tracks";

export default async function PersonaIndex() {
  const personas = await listPersonas();

  return (
    <main className="container-page py-[5rem] flex flex-col gap-[3rem] flex-1">
      <header className="flex flex-col gap-3 max-w-[48rem]">
        <Link href="/start" className="label-eyebrow hover:text-ink w-fit">← Choose partner</Link>
        <h1 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">
          Know exactly who you&apos;re facing
        </h1>
        <p className="text-muted text-[1rem] max-w-[44rem]">
          A final round isn&apos;t a generic archetype — it&apos;s a specific person. Greenroom{" "}
          <strong className="text-ink">distills a real interviewer</strong> from their public
          traces: their cited knowledge, their objective, and how they actually talk. Then you
          spar with <em>them</em>.
        </p>
      </header>

      {personas.length > 0 ? (
        <section className="grid gap-[1.25rem] sm:grid-cols-2 max-w-[52rem]">
          {personas.map((p) => {
            const round = getTrack(p.baseTrack);
            return (
              <Link
                key={p.slug}
                href={`/persona/${encodeURIComponent(p.slug)}`}
                className="card-product group flex flex-col gap-3 transition-colors hover:border-ink/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-[2.6rem] h-[2.6rem] shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-display text-[0.9rem]">
                      {p.avatar}
                    </span>
                    <div className="flex flex-col">
                      <h2 className="font-display text-[1.2rem] leading-tight">{p.name}</h2>
                      <span className="text-muted text-[0.78rem]">{p.role}</span>
                    </div>
                  </div>
                  <span className="source-chip shrink-0">◆ distilled</span>
                </div>
                <p className="text-muted text-[0.88rem] flex-1">{p.headline}</p>
                <div className="text-[0.78rem] font-medium" style={{ color: "var(--verified)" }}>
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
        <section className="card-product max-w-[40rem] flex flex-col gap-2">
          <span className="label-eyebrow">No personas yet</span>
          <p className="text-muted text-[0.9rem]">
            Distill one from the command line:
          </p>
          <pre className="text-[0.82rem] bg-surface border border-border rounded-[0.5rem] p-3 overflow-auto">
            npm run distill -- &quot;Aswath Damodaran&quot; markets
          </pre>
          <p className="text-muted text-[0.85rem]">
            Drop a cited corpus at <code>data/personas/raw/&lt;slug&gt;.json</code> first to ground
            their voice in verbatim quotes.
          </p>
        </section>
      )}
    </main>
  );
}
