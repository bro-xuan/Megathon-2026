"use client";

import { useState } from "react";
import Link from "next/link";
import { DOMAINS, getPartnersByDomain, PREP_TARGETS, type DomainId } from "@/lib/tracks";
import { Avatar } from "@/app/components/avatar";

// Step 2 of the funnel: pick your sparring partner. One screen — domain pills across the top sell
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
    <main className="flex-1 flex flex-col">
      <section className="hero-aura border-b border-border">
        <div className="container-page pt-[3.5rem] pb-[2.5rem] flex flex-col gap-5 reveal">
          <Link href="/" className="label-eyebrow hover:text-ink w-fit transition-colors">
            ← Back home
          </Link>
          <div className="flex flex-col gap-3 max-w-[48rem]">
            <span className="label-eyebrow">Step 1 · Choose your interviewer</span>
            <h1 className="font-display text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.04]">
              Who do you want to spar with?
            </h1>
            <p className="text-muted text-[1.02rem] max-w-[44rem] leading-relaxed">
              Each partner is a persona, an objective, and the cited knowledge they grill you
              against. <strong className="text-ink">Cited</strong> partners check every factual
              claim against a real source — the part a generic AI can&apos;t do.
            </p>
          </div>

          {/* Domain pills — IB live, the rest sell the roadmap. */}
          <div className="inline-flex flex-wrap gap-1.5 p-1 bg-surface border border-border rounded-[0.9rem] w-fit">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                disabled={!d.live}
                onClick={() => d.live && setDomain(d.id)}
                className={`inline-flex items-center gap-1.5 rounded-[0.6rem] px-4 py-2 text-[0.9rem] font-medium transition-all ${
                  d.id === domain
                    ? "bg-ink text-white shadow-sm"
                    : d.live
                      ? "text-ink hover:bg-canvas"
                      : "text-muted opacity-55 cursor-not-allowed"
                }`}
              >
                {d.label}
                {!d.live && <span className="text-[0.6rem] uppercase tracking-wide">soon</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page py-[3rem] flex flex-col gap-[2.5rem]">
        {/* Distilled real people — the headline differentiator: face a specific named interviewer. */}
        <Link
          href="/persona"
          className="card-product card-grounded card-interactive group flex items-center justify-between gap-4 reveal"
        >
          <div className="flex items-center gap-4">
            <span className="w-[3rem] h-[3rem] shrink-0 rounded-[0.8rem] avatar-accent flex items-center justify-center font-display text-[1.1rem] shadow-sm">
              ◆
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-[1.2rem]">Face a specific person</span>
                <span className="source-chip">◆ distilled</span>
              </div>
              <p className="text-muted text-[0.9rem] max-w-[40rem] leading-relaxed">
                Know who&apos;s in your final round? Distill them from their public traces — their
                cited knowledge, objective, and how they actually talk — and spar with them.
              </p>
            </div>
          </div>
          <span className="text-verified-deep text-[0.88rem] font-semibold shrink-0 inline-flex items-center gap-1 transition-all group-hover:gap-2">
            Browse people →
          </span>
        </Link>

        {/* Partner roster for the active domain. Horizontal cards: portrait left, content fills
            the width so the grid uses the page instead of leaving a right-hand gutter. */}
        {partners.length > 0 ? (
          <section className="flex flex-col gap-4">
            <span className="label-eyebrow">{activeDomain.label} · {partners.length} partners</span>
            <div className="grid gap-[1.25rem] lg:grid-cols-2">
              {partners.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/spar/${encodeURIComponent(t.id)}`}
                  className={`card-product card-interactive group flex gap-5 reveal ${
                    t.grounded ? "card-grounded" : ""
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Avatar
                    src={t.portrait}
                    initials={t.avatar}
                    accent={t.grounded}
                    className="w-[4.5rem] h-[4.5rem] shrink-0 text-[1.1rem]"
                  />
                  <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <h2 className="font-display text-[1.25rem] leading-tight">{t.name}</h2>
                        <span className="text-muted text-[0.82rem]">
                          {t.role} · {t.title}
                        </span>
                      </div>
                      {t.grounded ? (
                        <span className="source-chip shrink-0">★ cited</span>
                      ) : (
                        <span className="pill shrink-0">delivery</span>
                      )}
                    </div>
                    <p className="text-muted text-[0.9rem] flex-1 leading-relaxed">{t.tagline}</p>
                    <div
                      className="text-[0.8rem] font-medium leading-snug"
                      style={{ color: t.grounded ? "var(--verified-deep)" : "var(--muted)" }}
                    >
                      {t.knowledgeLine}
                    </div>
                    <span className="text-ink text-[0.88rem] font-semibold inline-flex items-center gap-1 transition-all group-hover:gap-2">
                      Spar with {t.name.split(" ")[0]} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
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

        {/* Prep materials — the cited company packs, only relevant to the grounded (IB) arena. */}
        {partners.some((p) => p.grounded) && (
        <section className="flex flex-col gap-4 border-t border-border pt-[2.5rem]">
          <div className="flex flex-col gap-1.5">
            <span className="label-eyebrow">Prep materials</span>
            <h2 className="font-display text-[1.4rem]">Study before you go in</h2>
            <p className="text-muted text-[0.9rem] max-w-[44rem] leading-relaxed">
              The cited company knowledge the grounded partners grill you on — every fact links to
              its source.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {PREP_TARGETS.map((target) => (
              <Link
                key={target}
                href={`/study/${encodeURIComponent(target)}`}
                className="card-product card-interactive flex items-center gap-2.5 py-3"
              >
                <span className="w-[2rem] h-[2rem] rounded-[0.55rem] bg-surface border border-border flex items-center justify-center font-display text-[0.8rem]">
                  {target.slice(0, 2)}
                </span>
                <span className="font-display text-[1.05rem]">{target}</span>
                <span className="text-muted text-[0.8rem]">pack →</span>
              </Link>
            ))}
          </div>
        </section>
        )}
      </div>
    </main>
  );
}
