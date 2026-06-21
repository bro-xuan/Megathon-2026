// Scene 4 — the post-call debrief. The capability scorecard: a weighted readiness grade, the
// pentagon capability radar, and the five capability bars (strengths AND the catches), mirroring
// the real /debrief page and lib/scorecard.ts. Numbers are illustrative of a mid-progress run.
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { C } from "../theme";
import { gradeFor, bandColor } from "../theme";
import { FONT } from "../fonts";
import { Aura, Eyebrow, reveal, useSceneFade } from "../components/ui";
import { MONO_FALLBACK } from "../components/tokens";

type Dim = { key: string; label: string; short: string; score: number; note: string };
const DIMS: Dim[] = [
  { key: "grounding", label: "Grounding", short: "Grounding", score: 52, note: "2 claims didn't survive the cited data" },
  { key: "technical", label: "Technical depth", short: "Technical", score: 64, note: "Solid fundamentals; valuation framing was stale" },
  { key: "communication", label: "Communication", short: "Comms", score: 72, note: "Clear and direct — answered without rambling" },
  { key: "composure", label: "Composure", short: "Composure", score: 50, note: "Doubled down when pushed instead of reconsidering" },
  { key: "structure", label: "Structure", short: "Structure", score: 66, note: "Sensible arc: basics → scale → M&A" },
];
// Weighted readiness — grounding 2×, mirroring lib/scorecard.ts.
const READINESS = Math.round(
  DIMS.reduce((a, d) => a + d.score * (d.key === "grounding" ? 2 : 1), 0) / (DIMS.length + 1),
);

export const SceneDebrief: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = useSceneFade(durationInFrames, 14, 16);
  const { grade, label, color } = gradeFor(READINESS);
  const count = Math.round(interpolate(frame, [30, 70], [0, READINESS], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));

  return (
    <AbsoluteFill style={{ background: C.canvas, opacity, fontFamily: FONT.sans, color: C.ink }}>
      <Aura glow={false} />
      <div style={{ position: "absolute", top: 76, left: 110, ...reveal(frame, 8, 18) }}>
        <Eyebrow style={{ fontSize: 21 }}>Post-call debrief · Stock pitch</Eyebrow>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.03em", fontSize: 56, marginTop: 8 }}>
          How you carried it.
        </div>
      </div>

      <div style={{ position: "absolute", top: 230, left: 110, right: 110, bottom: 80, display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: 70, alignItems: "center" }}>
        {/* Readiness hero + radar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ ...reveal(frame, 26, 18), display: "flex", alignItems: "baseline", gap: 26 }}>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.04em", fontSize: 150, lineHeight: 1, color }}>{grade}</span>
            <div>
              <div style={{ fontFamily: MONO_FALLBACK, fontSize: 40, color: C.ink }}>{count}<span style={{ color: C.muted, fontSize: 26 }}>/100</span></div>
              <div style={{ fontSize: 26, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>readiness · grounding weighted 2×</div>
            </div>
          </div>
          <Radar frame={frame} dims={DIMS} />
        </div>

        {/* Capability bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Eyebrow style={{ fontSize: 20 }}>Capabilities</Eyebrow>
          {DIMS.map((d, i) => (
            <Bar key={d.key} dim={d} frame={frame} start={96 + i * 20} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Bar: React.FC<{ dim: Dim; frame: number; start: number }> = ({ dim, frame, start }) => {
  const p = interpolate(frame, [start, start + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const color = bandColor(dim.score);
  return (
    <div style={reveal(frame, start, 18, 16)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: 27, fontWeight: 600 }}>{dim.label}</span>
        <span style={{ fontFamily: MONO_FALLBACK, fontSize: 25, color }}>{Math.round(dim.score * p)}</span>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: C.surface, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${dim.score * p}%`, background: color, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 19, color: C.muted, marginTop: 7 }}>{dim.note}</div>
    </div>
  );
};

// Pentagon capability radar — 5 axes, animated draw. The canvas is wider than the plot radius so
// the left/right axis labels ("Technical", "Structure") have room and don't clip.
const Radar: React.FC<{ frame: number; dims: Dim[] }> = ({ frame, dims }) => {
  const svgW = 640;
  const svgH = 470;
  const cx = svgW / 2;
  const cy = 220;
  const maxR = 150;
  const n = dims.length;
  const draw = interpolate(frame, [56, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    dims.map((_, i) => pt(i, maxR * f).join(",")).join(" "),
  );
  const valuePoly = dims.map((d, i) => pt(i, maxR * (d.score / 100) * draw).join(",")).join(" ");

  return (
    <svg width={svgW} height={svgH}>
      {/* guide rings */}
      {rings.map((r, i) => (
        <polygon key={i} points={r} fill="none" stroke={C.border} strokeWidth={i === rings.length - 1 ? 1.5 : 1} />
      ))}
      {/* spokes */}
      {dims.map((_, i) => {
        const [x, y] = pt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.border} strokeWidth={1} />;
      })}
      {/* value polygon */}
      <polygon points={valuePoly} fill="rgba(28,138,78,0.16)" stroke={C.verified} strokeWidth={2.5} strokeLinejoin="round" />
      {dims.map((d, i) => {
        const [x, y] = pt(i, maxR * (d.score / 100) * draw);
        return <circle key={i} cx={x} cy={y} r={4.5} fill={C.verified} opacity={draw} />;
      })}
      {/* axis labels */}
      {dims.map((d, i) => {
        const [x, y] = pt(i, maxR + 28);
        const a = angle(i);
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <text key={d.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontFamily={FONT.sans} fontSize={19} fontWeight={600} fill={C.inkSoft} opacity={draw}>
            {d.short}
          </text>
        );
      })}
    </svg>
  );
};
