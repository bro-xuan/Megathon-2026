import type { ClaimCheck, DebriefResult, Dimension, FactCheckFlag, GeneralDebrief, TranscriptTurn } from "@/lib/types";
import { SourceChip } from "@/app/components/facts";
import { DIM_BLURB, DIM_SHORT, bandColor, gradeFor, readinessScore } from "@/lib/scorecard";

const SEVERITY_COLOR: Record<FactCheckFlag["severity"], string> = {
  high: "var(--flag)",
  medium: "var(--flag-medium)",
  low: "var(--muted)",
};

// ── Readiness hero: the scorecard that leads the page ────────────────────────

/** A one-line read on overall readiness, by band — the hero's headline. */
function readinessHeadline(score: number): string {
  if (score >= 75) return "Interview-ready — a few edges left to sand.";
  if (score >= 55) return "Promising, but a real MD would still push.";
  return "Not ready to walk in yet — here's why.";
}

/** Big circular grade dial — the dramatic headline letter + the 0–100 underneath. */
function GradeDial({ score }: { score: number }) {
  const { grade, label, color } = gradeFor(score);
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative w-[8.5rem] h-[8.5rem]">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--surface) 0deg)` }}
        />
        <div className="absolute inset-[0.55rem] rounded-full bg-surface-product border border-border flex flex-col items-center justify-center">
          <span className="font-display text-[2.9rem] leading-none" style={{ color }}>{grade}</span>
          <span className="text-muted text-[0.68rem] mt-1">
            <span className="font-display text-ink text-[0.9rem]">{score}</span> / 100
          </span>
        </div>
      </div>
      <span className="label-eyebrow" style={{ color }}>{label}</span>
    </div>
  );
}

/** A capability radar — generic n-gon (5 axes grounded, 4 ungrounded), filled by band color. */
function CapabilityRadar({ dimensions }: { dimensions: Dimension[] }) {
  const n = dimensions.length;
  if (n < 3) return null;
  const cx = 150;
  const cy = 116;
  const R = 68;
  const overall = readinessScore(dimensions);
  const fill = bandColor(overall);
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (i: number, r: number): [number, number] => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  const poly = (pts: [number, number][]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = dimensions.map((d, i) => at(i, R * (Math.max(5, d.score) / 100)));
  return (
    <svg viewBox="0 0 300 232" width="100%" role="img" aria-label="Capability radar" style={{ display: "block", maxWidth: "17rem", margin: "0 auto" }}>
      {rings.map((rr, i) => (
        <polygon key={i} points={poly(dimensions.map((_, j) => at(j, R * rr)))} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      {dimensions.map((_, i) => {
        const [x, y] = at(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon
        points={poly(dataPts)}
        fill={`color-mix(in srgb, ${fill} 16%, transparent)`}
        stroke={fill}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {dataPts.map((p, i) => (
        // Vertex colored by its OWN band, not the average — so a weak axis reads red even when
        // the overall polygon is amber. This is the per-capability signal the radar exists for.
        <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={bandColor(dimensions[i].score)} />
      ))}
      {dimensions.map((d, i) => {
        const [lx, ly] = at(i, R + 15);
        const c = Math.cos(angle(i));
        const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={10.5}
            fontFamily="var(--font-mono), monospace"
            fill="var(--muted)"
          >
            {DIM_SHORT[d.key]}
          </text>
        );
      })}
    </svg>
  );
}

/** Compact tally for grounded rounds: verified · bluffs · recovery (the fact-check headline). */
function TallyStrip({ debrief }: { debrief: DebriefResult }) {
  const { verifiedCount, totalClaims, flags } = debrief;
  const challenged = flags.filter((f) => f.recovery === "recovered" || f.recovery === "doubled-down");
  const recovered = challenged.filter((f) => f.recovery === "recovered").length;
  const allOwned = challenged.length > 0 && recovered === challenged.length;
  return (
    <div className="flex flex-wrap gap-x-[1.75rem] gap-y-2 pt-[1.1rem] border-t border-border">
      <Tally label="Claims verified" value={`${verifiedCount}`} suffix={`/ ${totalClaims}`} color="var(--verified-deep)" />
      <Tally label="Bluffs caught" value={`${flags.length}`} color={flags.length ? "var(--flag)" : "var(--verified)"} />
      {challenged.length ? (
        <Tally label="Recovery" value={`${recovered}`} suffix={`/ ${challenged.length} owned`} color={allOwned ? "var(--verified)" : "var(--flag)"} />
      ) : (
        <Tally label="Recovery" value="—" suffix="untested" color="var(--muted)" />
      )}
    </div>
  );
}

function Tally({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color: string }) {
  return (
    <div>
      <div className="label-eyebrow">{label}</div>
      <div className="font-display text-[1.6rem] leading-tight" style={{ color }}>
        {value}
        {suffix && <span className="text-muted text-[0.85rem] font-sans"> {suffix}</span>}
      </div>
    </div>
  );
}

/** The capability breakdown — one bar + note per measured dimension. */
export function CapabilityBars({ dimensions }: { dimensions: Dimension[] }) {
  return (
    <section className="card-product reveal" style={{ animationDelay: "80ms" }}>
      <div className="label-eyebrow mb-1">Capabilities</div>
      <p className="text-muted text-[0.85rem] mb-[1.4rem]">
        Each capability scored from the transcript and the fact-check — not a single number.
      </p>
      <div className="grid gap-x-[2.5rem] gap-y-[1.25rem] md:grid-cols-2">
        {dimensions.map((d) => {
          const color = bandColor(d.score);
          return (
            <div key={d.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[0.98rem]">{d.label}</span>
                <span className="font-display text-[1rem]" style={{ color }}>{d.score}</span>
              </div>
              <div className="h-[0.5rem] rounded-full bg-surface overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, d.score)}%`, background: color }} />
              </div>
              <p className="text-muted text-[0.8rem] leading-snug">{d.note || DIM_BLURB[d.key]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The hero scorecard: grade dial + verdict + capability radar. Leads both grounded and
 *  general debriefs. `tally` (grounded only) folds in the verified/bluffs/recovery headline. */
export function ReadinessHero({
  dimensions,
  verdict,
  tally,
}: {
  dimensions: Dimension[];
  verdict?: string;
  tally?: DebriefResult;
}) {
  const readiness = readinessScore(dimensions);
  return (
    <section className="card-product reveal">
      <div className="label-eyebrow mb-[1.25rem]">Readiness</div>
      <div className="grid gap-[2rem] items-center lg:grid-cols-[auto_1fr_auto]">
        <GradeDial score={readiness} />
        <div className="flex flex-col gap-3 min-w-0">
          <h2 className="font-display text-[clamp(1.2rem,2vw,1.55rem)] leading-snug">
            {readinessHeadline(readiness)}
          </h2>
          {verdict && <p className="text-[0.95rem] text-ink-soft leading-relaxed">{verdict}</p>}
          {tally && <TallyStrip debrief={tally} />}
        </div>
        <CapabilityRadar dimensions={dimensions} />
      </div>
    </section>
  );
}

// How the candidate handled the bluff once it was on the table — the coaching payload.
const RECOVERY_VIEW: Record<NonNullable<FactCheckFlag["recovery"]>, { mark: string; text: string; color: string }> = {
  recovered: { mark: "✓", text: "Owned it — corrected when the MD pushed back", color: "var(--verified)" },
  "doubled-down": { mark: "✕", text: "Doubled down — repeated the wrong figure under pressure", color: "var(--flag)" },
  "not-challenged": { mark: "·", text: "Slipped by — the MD didn't test it this round", color: "var(--muted)" },
};

/** A caught bluff: quote · issue · correct value · what you did when pushed · source. Reveals with a stagger. */
export function FlagCard({ flag, index = 0 }: { flag: FactCheckFlag; index?: number }) {
  const color = SEVERITY_COLOR[flag.severity];
  const rec = flag.recovery ? RECOVERY_VIEW[flag.recovery] : null;
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
      {rec && (
        <p className="text-[0.85rem] mb-3 flex items-center gap-2" style={{ color: rec.color }}>
          <span aria-hidden>↳</span>
          <span><span className="font-semibold">{rec.mark}</span> {rec.text}</span>
        </p>
      )}
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

/** Delivery-coaching detail for ungrounded tracks (strengths + fixes). The headline + radar
 *  are carried by <ReadinessHero> above; this renders only the two coaching columns. */
export function GeneralDebriefView({ debrief }: { debrief: GeneralDebrief }) {
  return (
    <div className="flex flex-col gap-[2.5rem]">
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
