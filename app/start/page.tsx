"use client";

import { useState } from "react";
import Link from "next/link";
import { DOMAINS, getPartnersByDomain, PREP_TARGETS, type DomainId } from "@/lib/tracks";

// Step 2 of the funnel: pick your sparring partner. One screen — domain tabs across the top sell
// the platform breadth (IB live, the rest "soon"); partner cards under the active tab lead with
// KNOWLEDGE (the cited moat), persona second. Grounded partners sort first. Companies are PREP
// MATERIAL, not a selection step — shown as a supporting strip below.
export default function StartPage() {
  const [domain, setDomain] = useState<DomainId>("investment-banking");
  const partners = getPartnersByDomain(domain).sort(
    (a, b) => Number(b.grounded) - Number(a.grounded),
  );
  const activeDomain = DOMAINS.find((d) => d.id === domain)!;

  return (
    <main className="container-page py-[5rem] flex flex-col gap-[3rem] flex-1">
      <header className="flex flex-col gap-3 max-w-[48rem]">
        <Link href="/" className="label-eyebrow hover:text-ink w-fit">← Greenroom</Link>
        <h1 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">
          Who do you want to spar with?
        </h1>
        <p className="text-muted text-[1rem] max-w-[44rem]">
          Each partner is a persona, an objective, and the cited knowledge they grill you against.{" "}
          <strong className="text-ink">Cited</strong>{" "}partners check every factual claim against
          a real source — the part a generic AI can&apos;t do.
        </p>
      </header>

      {/* Domain tabs — IB live, the rest sell the roadmap. */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            disabled={!d.live}
            onClick={() => d.live && setDomain(d.id)}
            className={`${d.id === domain ? "btn-primary" : "btn-secondary"} ${
              !d.live ? "opacity-45 cursor-not-allowed" : ""
            }`}
          >
            {d.label}
            {!d.live && <span className="text-[0.65rem] uppercase tracking-wide ml-1">soon</span>}
          </button>
        ))}
      </div>

      {/* Partner roster for the active domain. */}
      {partners.length > 0 ? (
        <section className="grid gap-[1.25rem] sm:grid-cols-2 max-w-[52rem]">
          {partners.map((t) => (
            <Link
              key={t.id}
              href={`/spar/${encodeURIComponent(t.id)}`}
              className="card-product group flex flex-col gap-3 transition-colors hover:border-ink/30"
              style={
                t.grounded
                  ? { borderColor: "color-mix(in srgb, var(--verified) 35%, transparent)" }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-[2.6rem] h-[2.6rem] shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-display text-[0.9rem]">
                    {t.avatar}
                  </span>
                  <div className="flex flex-col">
                    <h2 className="font-display text-[1.2rem] leading-tight">{t.persona}</h2>
                    <span className="text-muted text-[0.78rem]">{t.title}</span>
                  </div>
                </div>
                {t.grounded ? (
                  <span className="source-chip shrink-0">★ cited</span>
                ) : (
                  <span className="label-eyebrow shrink-0">delivery</span>
                )}
              </div>
              <p className="text-muted text-[0.88rem] flex-1">{t.tagline}</p>
              <div
                className="text-[0.78rem] font-medium"
                style={{ color: t.grounded ? "var(--verified)" : "var(--muted)" }}
              >
                {t.knowledgeLine}
              </div>
              <span className="text-ink text-[0.85rem] font-semibold inline-flex items-center gap-1 transition-all group-hover:gap-2">
                Spar with {t.persona.replace(/^The /, "")} →
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <section className="card-product max-w-[34rem] flex flex-col gap-2">
          <span className="label-eyebrow">{activeDomain.label}</span>
          <p className="text-muted text-[0.9rem]">
            Partners for this arena are coming soon. The same grounded engine — cited knowledge,
            persona, objective — applied to a new kind of conversation.
          </p>
        </section>
      )}

      {/* Prep materials — what the cited partners know (reference, not a selection step). */}
      <section className="flex flex-col gap-4 border-t border-border pt-[2.5rem]">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[1.3rem]">Prep materials</h2>
          <p className="text-muted text-[0.9rem] max-w-[44rem]">
            The cited company knowledge the grounded partners grill you on. Study before you go in
            — every fact links to its source.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {PREP_TARGETS.map((target) => (
            <Link
              key={target}
              href={`/study/${encodeURIComponent(target)}`}
              className="card-product flex items-center gap-2 transition-colors hover:border-ink/30"
            >
              <span className="font-display text-[1.1rem]">{target}</span>
              <span className="text-muted text-[0.8rem]">pack →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
