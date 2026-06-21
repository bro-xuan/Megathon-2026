import Link from "next/link";
import { CONVERSATION_CATEGORIES } from "@/lib/tracks";
import { Avatar } from "@/app/components/avatar";

// Landing = the hard-conversation menu (DESIGN.md §8.0). Framing is "practice ANY hard
// conversation", not "mock interviewer". The hero shows the product (a caught bluff, with its
// source) so a judge across the room instantly reads the moat; the category grid sells the
// breadth, the single lit "Job interview" tile + cited chips point to where the Cala moat is.

const PILLARS = [
  {
    no: "01",
    title: "Voice-native",
    body: "A real spoken rehearsal, not a chatbox. You talk; it listens and pushes back like the person across the table.",
  },
  {
    no: "02",
    title: "Grounded where facts matter",
    body: "Say something false and it catches you, then shows the receipt: a link to the real source, a filing or a paper. A generic AI can't. It has no source of truth.",
  },
  {
    no: "03",
    title: "Scored afterward",
    body: "A post-call debrief scores how you carried it and, where it applies, flags every bluff with the fact you got wrong and where it came from.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      {/* ── Hero ── the showpiece: framing on the left, live product proof on the right. */}
      <section className="hero-aura">
        <div className="container-page grid lg:grid-cols-[1.15fr_1fr] gap-[3.5rem] lg:items-start pt-[4.5rem] pb-[4rem]">
          <div className="flex flex-col gap-6 reveal">
            <span className="inline-flex items-center gap-2 w-fit pill border-border-strong text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-verified" />
              Voice · grounded · scored
            </span>
            <h1 className="font-display headline-accent text-[clamp(2.6rem,6.2vw,4.8rem)] leading-[1.0]">
              Practice any <em>hard conversation.</em>
            </h1>
            {/* High-level one-liner: the mission (why) sits between the headline and the
                supporting paragraph (how). Sharp, exec-ready, no dashes. */}
            <p className="text-ink-soft text-[1.35rem] font-medium max-w-[33rem] leading-snug">
              The room where you get ready for what counts, the conversations you can&apos;t afford
              to get wrong.
            </p>
            <p className="text-muted text-[1.08rem] max-w-[34rem] leading-relaxed">
              Rehearse the conversations you dread, out loud, against someone who pushes back. Where
              facts matter, every claim is checked against a{" "}
              <strong className="text-ink">real source</strong>: a filing, a paper, the record. It
              catches the moment you bluff.
            </p>
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <Link href="/start" className="btn-accent text-[0.98rem]">
                Start practicing →
              </Link>
              <Link href="/debrief/mock-stripe" className="btn-secondary text-[0.95rem]">
                See a sample debrief
              </Link>
            </div>
          </div>

          {/* Product proof — three capabilities of ONE stock-pitch round, NOT three bluff
              examples. Composition (not a tall vertical stack): the cited moat card LEADS at
              full width, then "pushes back" + "scores you" sit side-by-side beneath it. Halves
              the column height while still showing all three things the product does. */}
          <div
            className="reveal lg:justify-self-end w-full max-w-[27rem] flex flex-col gap-3"
            style={{ animationDelay: "120ms" }}
          >
            <span className="label-eyebrow">One stock-pitch round</span>

            {/* Catches bluffs — the cited moat, leads the composition. Slim single-line Cala
                attribution (the standalone tagline was redundant with the hero copy). */}
            <div className="card-product card-grounded flex flex-col gap-3 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between">
                <span className="label-eyebrow" style={{ color: "var(--verified-deep)" }}>
                  Catches bluffs
                </span>
                <span className="source-chip">★ cited</span>
              </div>
              <div className="flex items-start gap-3">
                <Avatar
                  src="/portraits/stock-pitch.jpg"
                  initials="MD"
                  className="w-[2rem] h-[2rem] shrink-0 text-[0.7rem]"
                />
                <p className="fact-value text-ink-soft">
                  &ldquo;OpenAI&apos;s last round valued it around{" "}
                  <span className="text-flag line-through decoration-flag/50">$300 billion</span>
                  .&rdquo;
                </p>
              </div>
              <div className="border border-border rounded-[0.7rem] p-3 bg-canvas flex flex-col gap-2">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-flag">
                  ✕ bluff caught
                </span>
                <p className="text-[0.88rem]">
                  <span className="text-muted">Correct: </span>
                  <span className="fact-value">$852B after its $122B round (early 2026)</span>
                </p>
                {/* Citation must actually support the claim — the CNBC piece reports the
                    $852B valuation / $122B round (closed 2026-03-31). NEVER link a source
                    that contradicts the stated fact: it's the one click that kills a
                    "grounded, cited" demo. */}
                <a
                  href="https://www.cnbc.com/2026/03/31/openai-funding-round-ipo.html"
                  target="_blank"
                  rel="noreferrer"
                  className="source-chip w-fit"
                >
                  ↗ cnbc.com
                </a>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-muted text-[0.66rem] uppercase tracking-wide border-t border-border pt-2.5">
                verified by
                <img src="/cala-logo.png" alt="Cala.ai" className="h-[0.85rem] w-auto opacity-80" />
              </div>
            </div>

            {/* The other two capabilities, side-by-side — compact so the column stays short. */}
            <div className="grid grid-cols-2 gap-3">
              {/* Pushes back: a real spoken sparring partner, not a chatbox. */}
              <div
                className="card-product flex flex-col gap-2 shadow-[var(--shadow-sm)]"
                style={{ padding: "0.9rem 1rem" }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="label-eyebrow">Pushes back</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-verified shrink-0" />
                </div>
                <p className="text-[0.85rem] leading-snug text-ink-soft">
                  &ldquo;Bold call — defend your gross margin at scale.&rdquo;
                </p>
              </div>

              {/* Scores you: post-call debrief. Grounding low BECAUSE of the bluff above —
                  same session, so the flag points back at the moat card. Links to the sample. */}
              <Link
                href="/debrief/mock-stripe"
                className="card-product card-interactive flex flex-col gap-2 shadow-[var(--shadow-sm)] no-underline"
                style={{ padding: "0.9rem 1rem" }}
              >
                <span className="label-eyebrow">Scores you</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[1.5rem] leading-none text-ink">B</span>
                  <span className="text-[0.74rem] text-muted">78 / 100</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: "Composure", pct: 84, flag: false },
                    { label: "Grounding", pct: 38, flag: true },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center gap-1.5">
                      <span className="text-[0.62rem] text-muted w-[3.4rem] shrink-0">
                        {b.label}
                      </span>
                      <span className="h-1 flex-1 rounded-full bg-surface overflow-hidden">
                        <span
                          className={`block h-full rounded-full ${b.flag ? "bg-flag" : "bg-verified"}`}
                          style={{ width: `${b.pct}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-[0.7rem] text-flag">✕ 1 bluff flagged</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── The menu — pick your conversation. ── */}
      <section className="border-t border-border bg-canvas-tint">
        <div className="container-page py-[4rem] flex flex-col gap-7">
          <div className="flex flex-col gap-2 max-w-[44rem]">
            <span className="label-eyebrow">The menu</span>
            <h2 className="font-display text-[clamp(1.7rem,3vw,2.3rem)]">Pick your conversation</h2>
            <p className="text-muted text-[0.98rem]">
              <strong className="text-ink">Cited</strong> conversations check every claim against a
              real source: a filing, a paper, the record. A generic AI can&apos;t. More coming.
            </p>
          </div>

          {/* Grid fills the full container width (no inner max-w) so it doesn't leave a dead
              band on the right. Every category is a live, uniform card linking to /start — no
              "soon" badges, no greyed-out roadmap state. */}
          <div className="grid gap-[1.25rem] sm:grid-cols-2">
            {CONVERSATION_CATEGORIES.map((c, i) => {
              const tierChip = c.grounded ? (
                <span className="source-chip shrink-0">★ cited</span>
              ) : (
                <span className="pill shrink-0">delivery</span>
              );

              return (
                <Link
                  key={c.id}
                  href="/start"
                  className={`card-product card-interactive group flex flex-col gap-3.5 reveal ${
                    c.grounded ? "card-grounded" : ""
                  }`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-[1.3rem] leading-tight">{c.label}</h3>
                    {tierChip}
                  </div>
                  <p className="text-muted text-[0.92rem] flex-1 leading-relaxed">{c.blurb}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.examples.map((ex) => (
                      <span
                        key={ex}
                        className="fact-value text-[0.72rem] text-muted border border-border rounded-full px-2 py-0.5"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                  <span className="text-[var(--verified-deep)] text-[0.92rem] font-semibold inline-flex items-center gap-1 transition-all group-hover:gap-2">
                    Start →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Moat explainer — reinforces the cited differentiator for judges. ── */}
      <section className="border-t border-border">
        <div className="container-page py-[4rem] grid gap-[2rem] md:grid-cols-3 max-w-[64rem]">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex flex-col gap-3">
              <span className="font-display text-[1.6rem] text-verified/30 leading-none">{p.no}</span>
              <h3 className="font-display text-[1.2rem]">{p.title}</h3>
              <p className="text-muted text-[0.92rem] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
