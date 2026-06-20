import type { ClaimCheck, DebriefResult, FactCheckFlag, TranscriptTurn } from "@/lib/types";
import { SourceChip } from "@/app/components/facts";

const SEVERITY_COLOR: Record<FactCheckFlag["severity"], string> = {
  high: "var(--flag)",
  medium: "var(--flag-medium)",
  low: "var(--muted)",
};

/** Top scorecard — overall accuracy + the citation-density tally. */
export function ScorePanel({ debrief }: { debrief: DebriefResult }) {
  const { score, verifiedCount, totalClaims, flags } = debrief;
  return (
    <section className="card-product flex flex-wrap items-center gap-[2.5rem]">
      <div>
        <div className="label-eyebrow">Accuracy</div>
        <div className="font-display text-[3rem] leading-none">{score}</div>
        <div className="text-muted text-[0.8rem]">out of 100</div>
      </div>
      <div className="h-[3rem] w-px bg-border" />
      <div>
        <div className="label-eyebrow">Claims verified</div>
        <div className="font-display text-[2rem] leading-tight">
          {verifiedCount}<span className="text-muted text-[1.1rem]"> / {totalClaims}</span>
        </div>
        <div className="text-muted text-[0.8rem]">every one linked to a source</div>
      </div>
      <div className="h-[3rem] w-px bg-border" />
      <div>
        <div className="label-eyebrow">Bluffs caught</div>
        <div className="font-display text-[2rem] leading-tight" style={{ color: flags.length ? "var(--flag)" : "var(--verified)" }}>
          {flags.length}
        </div>
        <div className="text-muted text-[0.8rem]">all sourced</div>
      </div>
    </section>
  );
}

/** A caught bluff: quote · issue · correct value · source. */
export function FlagCard({ flag }: { flag: FactCheckFlag }) {
  const color = SEVERITY_COLOR[flag.severity];
  return (
    <div className="card-product border-l-2" style={{ borderLeftColor: color }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[0.7rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ color, border: `1px solid ${color}` }}
        >
          {flag.severity} · bluff
        </span>
      </div>
      <p className="fact-value mb-2">&ldquo;{flag.quote}&rdquo;</p>
      <p className="text-[0.9rem] mb-1">{flag.issue}</p>
      <p className="text-[0.9rem] mb-3">
        <span className="text-muted">Correct: </span>
        <span className="fact-value">{flag.correctValue}</span>
      </p>
      {flag.sourceUrl && <SourceChip url={flag.sourceUrl} />}
    </div>
  );
}

const VERDICT_MARK: Record<ClaimCheck["verdict"], { mark: string; color: string }> = {
  verified: { mark: "✓", color: "var(--verified)" },
  flagged: { mark: "✕", color: "var(--flag)" },
  unverifiable: { mark: "?", color: "var(--muted)" },
};

/** One checked claim with its verdict + citation (the citation-dense wall). */
export function ClaimRow({ claim }: { claim: ClaimCheck }) {
  const v = VERDICT_MARK[claim.verdict];
  return (
    <li className="flex gap-3 py-3 border-b border-border last:border-b-0">
      <span className="font-mono text-[1rem] mt-0.5" style={{ color: v.color }} aria-hidden>
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
          <span className="text-[0.7rem] uppercase tracking-wide" style={{ color: v.color }}>
            {claim.verdict}
          </span>
          {claim.sourceUrl && <SourceChip url={claim.sourceUrl} />}
        </div>
      </div>
    </li>
  );
}

/** The raw interview transcript, role-tagged. */
export function TranscriptView({ transcript }: { transcript: TranscriptTurn[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {transcript.map((t, i) => (
        <li key={i} className="flex flex-col gap-1">
          <span className="label-eyebrow">{t.role}</span>
          <p className={t.role === "candidate" ? "fact-value" : "text-[0.9rem] text-muted"}>{t.text}</p>
        </li>
      ))}
    </ul>
  );
}
