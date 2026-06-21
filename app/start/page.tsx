"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CONVERSATION_CATEGORIES,
  DOMAINS,
  getCategory,
  getPartnersByDomain,
  PREP_TARGETS,
  type CategoryId,
  type DomainId,
} from "@/lib/tracks";
import { Avatar } from "@/app/components/avatar";

// Step 1 of the funnel: pick the KIND of conversation, then (for the one built category) the
// partner. Two stacked layers so the "practice any hard conversation" breadth lives IN the flow,
// not just on the landing page:
//   1. CONVERSATION_CATEGORIES — interview is lit; the rest are honest "soon" tiles (golden rule
//      #4: sell the breadth, never pretend the unbuilt is done).
//   2. For the live (interview) category: domain pills (IB live, rest soon) → partner roster, led
//      by KNOWLEDGE (the cited moat). Companies are PREP MATERIAL, shown as a supporting strip.
// Picking a not-yet-built category swaps the lower half for a roadmap panel — the breadth is
// explorable, not decorative.
export default function StartPage() {
  const [category, setCategory] = useState<CategoryId>("interview");
  const [domain, setDomain] = useState<DomainId>("investment-banking");

  const activeCategory = getCategory(category)!;
  const partners = getPartnersByDomain(domain).sort(
    (a, b) => Number(b.grounded) - Number(a.grounded),
  );
  const activeDomain = DOMAINS.find((d) => d.id === domain)!;

  return (
    <main className="flex-1 flex flex-col">
      <section className="hero-aura border-b border-border">
        <div className="container-page pt-[3.5rem] pb-[2.75rem] flex flex-col gap-7 reveal">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link href="/" className="label-eyebrow hover:text-ink transition-colors">
              ← Back home
            </Link>
            {/* Two-step funnel, made explicit so the breadth (step 1) never reads as the
                interview's chrome. Step 2's label tracks whether the chosen category is built. */}
            <div className="flex items-center gap-2.5 text-[0.82rem]">
              <span className="flex items-center gap-2">
                <span className="w-[1.45rem] h-[1.45rem] rounded-full bg-ink text-white text-[0.72rem] font-semibold flex items-center justify-center">
                  1
                </span>
                <span className="font-semibold text-ink">Conversation</span>
              </span>
              <span className="w-6 h-px bg-border-strong" />
              <span className="flex items-center gap-2 text-muted">
                <span className="w-[1.45rem] h-[1.45rem] rounded-full bg-surface border border-border-strong text-[0.72rem] font-semibold flex items-center justify-center">
                  2
                </span>
                <span>{activeCategory.live ? "Who you face" : "Coming soon"}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-[48rem]">
            <span className="label-eyebrow">Step 1 of 2</span>
            <h1 className="font-display text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.04]">
              What kind of conversation?
            </h1>
            <p className="text-muted text-[1.02rem] max-w-[46rem] leading-relaxed">
              One room, every hard conversation. <strong className="text-ink">Cited</strong> ones
              check every claim against a real source: a filing, a paper, the record. A generic AI
              can&apos;t. Pick one to begin. The interview is live today.
            </p>
          </div>

          {/* Conversation categories — full cards so the breadth is unmistakable (not interview
              chrome). Interview is lit; the rest are honest roadmap tiles you can open to preview. */}
          <div className="grid gap-[1.1rem] sm:grid-cols-2 lg:grid-cols-4">
            {CONVERSATION_CATEGORIES.map((c) => {
              const active = c.id === category;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  aria-pressed={active}
                  className={`text-left card-product flex flex-col gap-3 transition-all ${
                    c.grounded ? "card-grounded" : ""
                  } ${
                    active
                      ? "ring-2 ring-[var(--verified)] shadow-[var(--shadow-lg)]"
                      : "opacity-70 hover:opacity-100 card-interactive"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-[1.08rem] leading-tight">{c.label}</h3>
                    {c.live ? (
                      c.grounded ? (
                        <span className="source-chip shrink-0">★ cited</span>
                      ) : (
                        <span className="pill shrink-0">delivery</span>
                      )
                    ) : (
                      <span className="pill shrink-0">soon</span>
                    )}
                  </div>
                  <p className="text-muted text-[0.82rem] leading-snug flex-1">{c.blurb}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.examples.slice(0, 3).map((ex) => (
                      <span
                        key={ex}
                        className="fact-value text-[0.66rem] text-muted border border-border rounded-full px-1.5 py-0.5"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                  {c.live ? (
                    <span className="text-verified-deep text-[0.8rem] font-semibold inline-flex items-center gap-1">
                      {active ? "Selected ↓" : "Choose →"}
                    </span>
                  ) : (
                    <span className="text-muted text-[0.8rem] font-medium">Preview the roadmap →</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container-page py-[3rem] flex flex-col gap-[2.5rem]">
        {activeCategory.live ? (
          <>
            {/* Step 2 within the interview category — narrow to a domain, then a partner. */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-[1.45rem] h-[1.45rem] rounded-full bg-ink text-white text-[0.72rem] font-semibold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="label-eyebrow">
                  {activeCategory.label} → choose who you&apos;ll face
                </span>
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
                    {!d.live && (
                      <span className="text-[0.6rem] uppercase tracking-wide">soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

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
                    Know who&apos;s in your final round? Distill them from their public traces: their
                    cited knowledge, objective, and how they actually talk. Then spar with them.
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
                <span className="label-eyebrow">
                  {activeDomain.label} · {partners.length} partners
                </span>
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
                        <p className="text-muted text-[0.9rem] flex-1 leading-relaxed">
                          {t.tagline}
                        </p>
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
                  Partners for this arena are coming soon. The same grounded engine, cited
                  knowledge, persona, and objective, applied to a new kind of conversation.
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
                    The cited company knowledge the grounded partners grill you on. Every fact links
                    to its source.
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
          </>
        ) : (
          /* Roadmap panel for a not-yet-built category — honest, but sells what's coming. */
          <section
            className={`card-product max-w-[44rem] flex flex-col gap-4 reveal ${
              activeCategory.grounded ? "card-grounded" : ""
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-[1.5rem]">{activeCategory.label}</h2>
              <span className="pill">soon</span>
              {activeCategory.grounded ? (
                <span className="source-chip">★ will be cited</span>
              ) : (
                <span className="pill">delivery</span>
              )}
            </div>
            <p className="text-muted text-[0.98rem] leading-relaxed">{activeCategory.blurb}</p>
            <div className="flex flex-wrap gap-1.5">
              {activeCategory.examples.map((ex) => (
                <span
                  key={ex}
                  className="fact-value text-[0.75rem] text-muted border border-border rounded-full px-2.5 py-1"
                >
                  {ex}
                </span>
              ))}
            </div>
            <p className="text-[0.88rem] text-ink-soft border-t border-border pt-4 leading-relaxed">
              The same engine: {activeCategory.grounded ? "cited knowledge, " : ""}persona and
              objective, pointed at a new kind of conversation.{" "}
              <Link href="/start" onClick={() => setCategory("interview")} className="text-verified-deep font-semibold">
                Try the interview →
              </Link>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
