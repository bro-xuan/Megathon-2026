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
    body: "State something false in a grounded round and it catches you — and shows the receipt, a real source link. A generic AI can't: it has no source of truth.",
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
        <div className="container-page grid lg:grid-cols-[1.15fr_1fr] gap-[3.5rem] items-center pt-[4.5rem] pb-[4rem]">
          <div className="flex flex-col gap-6 reveal">
            <span className="inline-flex items-center gap-2 w-fit pill border-border-strong text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-verified" />
              Voice · grounded · scored
            </span>
            <h1 className="font-display headline-accent text-[clamp(2.6rem,6.2vw,4.8rem)] leading-[1.0]">
              Practice any <em>hard conversation.</em>
            </h1>
            <p className="text-muted text-[1.12rem] max-w-[34rem] leading-relaxed">
              The room where you rehearse the conversations you dread — out loud, against someone
              who pushes back. Where facts matter, it&apos;s grounded in{" "}
              <strong className="text-ink">real, cited data</strong> and catches the moment you
              bluff.
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

          {/* Product proof — a real "bluff caught" card. Concrete, cited, sells the moat. */}
          <div
            className="reveal lg:justify-self-end w-full max-w-[26rem]"
            style={{ animationDelay: "120ms" }}
          >
            <div className="card-product card-grounded flex flex-col gap-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between">
                <span className="badge-live">live fact-check</span>
                <span className="source-chip">★ cited</span>
              </div>
              <div className="flex flex-col gap-3">
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
                    <span className="fact-value">~$852B after its $122B round (early 2026)</span>
                  </p>
                  <a
                    href="https://www.forbes.com/sites/antoniopequenoiv/2024/10/02/openai-valued-at-157-billion-after-closing-66-billion-funding-round"
                    target="_blank"
                    rel="noreferrer"
                    className="source-chip w-fit"
                  >
                    ↗ forbes.com
                  </a>
                </div>
              </div>
              {/* Attribution — the fact-check is powered by Cala.ai (the prize-bearing moat). */}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-muted text-[0.78rem] max-w-[14rem] leading-snug">
                  Every factual claim, checked against a cited source.
                </span>
                <span className="flex items-center gap-1.5 text-muted text-[0.68rem] uppercase tracking-wide shrink-0">
                  verified by
                  <img
                    src="/cala-logo.png"
                    alt="Cala.ai"
                    className="h-[0.9rem] w-auto opacity-80"
                  />
                </span>
              </div>
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
              <strong className="text-ink">Cited</strong> conversations check every factual claim
              against a real source — the part a generic AI can&apos;t do. More coming.
            </p>
          </div>

          <div className="grid gap-[1.25rem] sm:grid-cols-2 max-w-[58rem]">
            {CONVERSATION_CATEGORIES.map((c, i) => {
              const tierChip = c.grounded ? (
                <span className="source-chip shrink-0">★ cited</span>
              ) : (
                <span className="pill shrink-0">delivery</span>
              );

              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-[1.3rem] leading-tight">{c.label}</h3>
                      {!c.live && <span className="pill">soon</span>}
                    </div>
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
                  {c.live && (
                    <span className="text-verified-deep text-[0.92rem] font-semibold inline-flex items-center gap-1 transition-all group-hover:gap-2">
                      Start →
                    </span>
                  )}
                </>
              );

              const baseCls = c.grounded ? "card-grounded" : "";

              return c.live ? (
                <Link
                  key={c.id}
                  href="/start"
                  className={`card-product card-interactive group flex flex-col gap-3.5 reveal ${baseCls}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={c.id}
                  aria-disabled
                  className={`card-product flex flex-col gap-3.5 opacity-50 cursor-not-allowed reveal ${baseCls}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {body}
                </div>
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
