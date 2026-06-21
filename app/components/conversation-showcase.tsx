"use client";

// Hero product proof — a STACKED DECK of three hard conversations the room runs, auto-advancing
// so a judge sees the breadth (and the two flavors of the Cala moat) without scrolling. The
// front card is fully visible; the other two peek out below, then shuffle forward every few
// seconds. Pauses on hover/focus and respects prefers-reduced-motion (falls back to static + dots).
//
// The three cards deliberately show grounding as OPPORTUNISTIC, not interview-only:
//   1. Job interview      — Cala CATCHES a bluff (the classic moat beat).
//   2. Asking for a raise — Cala ARMS you with the startup's fundraise + comp data (a different
//                           flavor: it informs your ask, it doesn't catch you).
//   3. Tough personal talk — no ground truth at all; just the words, scored on delivery. Honest
//                           breadth: not everything is cited, and that's the point.

import { useEffect, useState } from "react";
import { Avatar } from "@/app/components/avatar";

const ADVANCE_MS = 3800;

// Relative-position styles: 0 = front (lit, crisp), 1 = next, 2 = after. Cards share a TOP edge
// (transform-origin: top) and the upcoming ones shift UP by a fixed amount so their top band peeks
// cleanly above the front card — the peek equals the translate, independent of the down-scale —
// blurring into depth like a physical deck of what's next. (Origin: bottom cancels the peek.)
const STACK = [
  { transform: "translateY(0) scale(1)", opacity: 1, blur: 0, zIndex: 30, shadow: "var(--shadow-lg)" },
  { transform: "translateY(-2.45rem) scale(0.955)", opacity: 0.94, blur: 0.5, zIndex: 20, shadow: "var(--shadow-md)" },
  { transform: "translateY(-4.5rem) scale(0.91)", opacity: 0.82, blur: 1, zIndex: 10, shadow: "var(--shadow-sm)" },
] as const;

const CARD_COUNT = 3;
// Headroom above the deck so the upcoming cards rise into reserved space (not into the hero text).
const PEEK_HEADROOM = "4.9rem";

export function ConversationShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance, paused on hover/focus and disabled when the user prefers reduced motion.
  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => setActive((a) => (a + 1) % CARD_COUNT), ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="reveal lg:justify-self-end w-full max-w-[27rem]"
      style={{ animationDelay: "120ms", paddingTop: PEEK_HEADROOM, marginTop: "2.5rem" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* The deck. All cards share one grid cell (grid-area 1/1) so the cell auto-sizes to the
          TALLEST card and every card stretches to match it — uniform height, no forced min-height,
          no dead space. Bottom-anchored transforms make upcoming cards rise above the front one,
          blurring into depth; the headroom above lets them rise without hitting the hero text. */}
      <div className="grid">
        {CARDS.map((card, i) => {
          const rel = (i - active + CARD_COUNT) % CARD_COUNT;
          const slot = STACK[rel];
          return (
            <div
              key={card.key}
              aria-hidden={rel !== 0}
              className={`card-product ${card.grounded ? "card-grounded" : ""} flex flex-col gap-3`}
              style={{
                gridArea: "1 / 1",
                padding: "1.2rem 1.3rem",
                transform: slot.transform,
                transformOrigin: "bottom center",
                opacity: slot.opacity,
                filter: slot.blur ? `blur(${slot.blur}px)` : "none",
                zIndex: slot.zIndex,
                boxShadow: slot.shadow,
                pointerEvents: rel === 0 ? "auto" : "none",
                transition:
                  "transform 0.55s cubic-bezier(0.2,0.7,0.2,1), opacity 0.55s ease, filter 0.55s ease, box-shadow 0.4s ease",
              }}
            >
              {card.body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── The three cards ───────────────────────────────────────────────────────────────────────────

type Card = { key: string; label: string; grounded: boolean; body: React.ReactNode };

const CARDS: Card[] = [
  {
    key: "interview",
    label: "Job interview",
    grounded: true,
    body: (
      <>
        <div className="flex items-center justify-between">
          <span className="label-eyebrow" style={{ color: "var(--verified-deep)" }}>
            Job interview
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
            <span className="text-flag line-through decoration-flag/50">$300 billion</span>.&rdquo;
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
          {/* Citation must actually support the claim — CNBC reports the $852B / $122B round. */}
          <a
            href="https://www.cnbc.com/2026/03/31/openai-funding-round-ipo.html"
            target="_blank"
            rel="noreferrer"
            className="source-chip w-fit"
          >
            ↗ cnbc.com
          </a>
        </div>
        <CalaFooter verb="caught by" />
      </>
    ),
  },
  {
    key: "raise",
    label: "Asking for a raise",
    grounded: true,
    body: (
      <>
        <div className="flex items-center justify-between">
          <span className="label-eyebrow" style={{ color: "var(--verified-deep)" }}>
            Asking for a raise
          </span>
          <span className="source-chip">★ cited</span>
        </div>
        <div className="flex items-start gap-3">
          <Avatar
            src="/portraits/behavioral.jpg"
            initials="HR"
            className="w-[2rem] h-[2rem] shrink-0 text-[0.62rem]"
          />
          <p className="fact-value text-ink-soft">
            &ldquo;So — what are your salary expectations?&rdquo;
          </p>
        </div>
        {/* The OTHER flavor of the moat: not a bluff caught, but YOU armed with the data. */}
        <div
          className="rounded-[0.7rem] p-3 flex flex-col gap-2"
          style={{ background: "var(--verified-soft)", border: "1px solid color-mix(in srgb, var(--verified) 24%, transparent)" }}
        >
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide" style={{ color: "var(--verified-deep)" }}>
            ✓ you walk in informed
          </span>
          <p className="text-[0.88rem]">
            <span className="text-muted">They raised a $40M Series B; comparable roles pay </span>
            <span className="fact-value">$130–160k</span>
            <span className="text-muted"> — so you anchor at $150k, not $110k.</span>
          </p>
          <a
            href="https://techcrunch.com/category/venture/"
            target="_blank"
            rel="noreferrer"
            className="source-chip w-fit"
          >
            ↗ funding announcement
          </a>
        </div>
        <CalaFooter verb="armed by" />
      </>
    ),
  },
  {
    key: "personal",
    label: "Tough personal talk",
    grounded: false,
    body: (
      <>
        <div className="flex items-center justify-between">
          <span className="label-eyebrow">Tough personal talk</span>
          <span className="pill shrink-0">delivery</span>
        </div>
        <div className="flex items-start gap-3">
          <Avatar
            src="/portraits/consulting-fit.jpg"
            initials="—"
            className="w-[2rem] h-[2rem] shrink-0 text-[0.9rem]"
          />
          <p className="fact-value text-ink-soft">
            &ldquo;Be honest with me — do you still see a future with us?&rdquo;
          </p>
        </div>
        {/* No ground truth here, and we say so. Honest about where the moat does and doesn't apply. */}
        <div className="border border-dashed border-border rounded-[0.7rem] p-3 bg-canvas flex flex-col gap-1.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
            no facts to check
          </span>
          <p className="text-[0.86rem] text-ink-soft leading-snug">
            Just the words you&apos;ve been avoiding. It pushes back; the debrief scores how you
            carried it.
          </p>
        </div>
        <div className="mt-auto flex items-center justify-end gap-1.5 text-muted text-[0.66rem] uppercase tracking-wide border-t border-border pt-2.5">
          delivery · scored after the call
        </div>
      </>
    ),
  },
];

function CalaFooter({ verb }: { verb: string }) {
  return (
    <div className="mt-auto flex items-center justify-end gap-1.5 text-muted text-[0.66rem] uppercase tracking-wide border-t border-border pt-2.5">
      {verb}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/cala-logo.png" alt="Cala.ai" className="h-[0.85rem] w-auto opacity-80" />
    </div>
  );
}
