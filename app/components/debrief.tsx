import type { ClaimCheck, DebriefResult, FactCheckFlag, GeneralDebrief, TranscriptTurn } from "@/lib/types";
import { SourceChip } from "@/app/components/facts";

const SEVERITY_COLOR: Record<FactCheckFlag["severity"], string> = {
  high: "var(--flag)",
  medium: "var(--flag-medium)",
  low: "var(--muted)",
};

/** A circular score gauge — the dramatic headline number, color-graded by band. */
function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 80 ? "var(--verified)" : pct >= 55 ? "var(--flag-medium)" : "var(--flag)";
  return (
    <div className="relative w-[7rem] h-[7rem] shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, var(--surface) 0deg)`,
        }}
      />
      <div className="absolute inset-[0.55rem] rounded-full bg-surface-product border border-border flex flex-col items-center justify-center">
        <span className="font-display text-[2rem] leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-muted text-[0.62rem] uppercase tracking-wide mt-0.5">{label}</span>
      </div>
    </div>
  );
}

/** Top scorecard — overall accuracy gauge + the citation-density tally. */
export function ScorePanel({ debrief }: { debrief: DebriefResult }) {
  const { score, verifiedCount, totalClaims, flags } = debrief;
  return (
    <section className="card-product flex flex-wrap items-center gap-[2rem] reveal">
      <ScoreGauge score={score} label="accuracy" />
      <div className="h-[3.5rem] w-px bg-border hidden sm:block" />
      <div>
        <div className="label-eyebrow">Claims verified</div>
        <div className="font-display text-[2.2rem] leading-tight" style={{ color: "var(--verified-deep)" }}>
          {verifiedCount}
          <span className="text-muted text-[1.1rem] font-sans"> / {totalClaims}</span>
        </div>
        <div className="text-muted text-[0.8rem]">every one linked to a source</div>
      </div>
      <div className="h-[3.5rem] w-px bg-border hidden sm:block" />
      <div>
        <div className="label-eyebrow">Bluffs caught</div>
        <div
          className="font-display text-[2.2rem] leading-tight"
          style={{ color: flags.length ? "var(--flag)" : "var(--verified)" }}
        >
          {flags.length}
        </div>
        <div className="text-muted text-[0.8rem]">all sourced</div>
      </div>
    </section>
  );
}

/** A caught bluff: quote · issue · correct value · source. Reveals with a stagger. */
export function FlagCard({ flag, index = 0 }: { flag: FactCheckFlag; index?: number }) {
  const color = SEVERITY_COLOR[flag.severity];
  return (
    <div
      className="card-product card-interactive border-l-[3px] reveal"
      style={{ borderLeftColor: color, animationDelay: `${index * 110}ms` }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ color, background: "color-mix(in srgb, " + color + " 10%, transparent)", border: `1px solid ${color}` }}
        >
          <span aria-hidden>✕</span> {flag.severity} · bluff
        </span>
      </div>
      <p className="fact-value mb-2.5 text-ink-soft">&ldquo;{flag.quote}&rdquo;</p>
      <p className="text-[0.9rem] mb-1.5">{flag.issue}</p>
      <p className="text-[0.9rem] mb-3">
        <span className="text-muted">Correct: </span>
        <span className="fact-value" style={{ color: "var(--verified-deep)" }}>{flag.correctValue}</span>
      </p>
      {flag.sourceUrl && <SourceChip url={flag.sourceUrl} />}
    </div>
  );
}

const VERDICT_MARK: Record<ClaimCheck["verdict"], { mark: string; color: string; bg: string }> = {
  verified: { mark: "✓", color: "var(--verified)", bg: "var(--verified-soft)" },
  flagged: { mark: "✕", color: "var(--flag)", bg: "var(--flag-soft)" },
  unverifiable: { mark: "?", color: "var(--muted)", bg: "var(--surface)" },
};

/** One checked claim with its verdict + citation (the citation-dense wall). */
export function ClaimRow({ claim }: { claim: ClaimCheck }) {
  const v = VERDICT_MARK[claim.verdict];
  return (
    <li className="flex gap-3 py-3 border-b border-border last:border-b-0">
      <span
        className="w-[1.4rem] h-[1.4rem] mt-0.5 shrink-0 rounded-full flex items-center justify-center text-[0.78rem] font-bold"
        style={{ color: v.color, background: v.bg }}
        aria-hidden
      >
        {v.mark}
      </span>
      <div className="flex flex-col gap-1 flex-1">
        <p className="fact-value">&ldquo;{claim.quote}&rdquo;</p>
        {claim.verdict === "flagged" && claim.correctValue && (
          <p className="text-[0.82rem]">
            <span className="text-muted">Correct: </span>
            {claim.correctValue}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[0.68rem] uppercase tracking-wide font-semibold" style={{ color: v.color }}>
            {claim.verdict}
          </span>
          {claim.sourceUrl && <SourceChip url={claim.sourceUrl} />}
        </div>
      </div>
    </li>
  );
}

/** Delivery-coaching debrief for ungrounded tracks (no fact-check — strengths + fixes). */
export function GeneralDebriefView({ debrief }: { debrief: GeneralDebrief }) {
  return (
    <div className="flex flex-col gap-[2.5rem]">
      <section className="card-product flex flex-wrap items-center gap-[2rem] reveal">
        <ScoreGauge score={debrief.score} label="delivery" />
        <p className="text-[0.98rem] flex-1 min-w-[16rem] leading-relaxed">{debrief.summary}</p>
      </section>

      <div className="grid gap-[1.5rem] md:grid-cols-2">
        <section className="card-product reveal" style={{ animationDelay: "80ms" }}>
          <h2 className="font-display text-[1.2rem] mb-3" style={{ color: "var(--verified-deep)" }}>
            What worked
          </h2>
          <ul className="flex flex-col gap-2.5">
            {debrief.strengths.map((s, i) => (
              <li key={i} className="text-[0.9rem] flex gap-2.5">
                <span
                  className="w-[1.2rem] h-[1.2rem] shrink-0 rounded-full flex items-center justify-center text-[0.7rem] font-bold mt-0.5"
                  style={{ color: "var(--verified)", background: "var(--verified-soft)" }}
                  aria-hidden
                >
                  ✓
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card-product reveal" style={{ animationDelay: "160ms" }}>
          <h2 className="font-display text-[1.2rem] mb-3">Sharpen this</h2>
          <ul className="flex flex-col gap-2.5">
            {debrief.improvements.map((s, i) => (
              <li key={i} className="text-[0.9rem] flex gap-2.5">
                <span className="text-muted mt-0.5" aria-hidden>
                  →
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** The raw interview transcript, role-tagged. */
export function TranscriptView({ transcript }: { transcript: TranscriptTurn[] }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {transcript.map((t, i) => (
        <li key={i} className="flex flex-col gap-1">
          <span className="label-eyebrow" style={{ color: t.role === "candidate" ? "var(--verified-deep)" : "var(--muted)" }}>
            {t.role}
          </span>
          <p className={t.role === "candidate" ? "fact-value" : "text-[0.9rem] text-ink-soft"}>{t.text}</p>
        </li>
      ))}
    </ul>
  );
}
