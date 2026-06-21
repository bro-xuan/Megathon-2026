// Scene 2 — Product intro. The lights come on (dark→white), the mark resolves, the 3-step model
// builds, then the Cala grounding card lands as the sharp edge (one capability, not the thesis).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, Easing } from "remotion";
import { C, SHADOW } from "../theme";
import { FONT } from "../fonts";
import { Aura, reveal, Eyebrow, SourceChip, useSceneFade } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
import { MONO_FALLBACK } from "../components/tokens";

const STEPS = [
  { n: "01", title: "Pick the conversation", sub: "The raise. The interview. The breakup. The cofounder talk." },
  { n: "02", title: "It becomes the person across the table", sub: "Their stance, their resistance, their toughest questions — not a yes-man." },
  { n: "03", title: "You talk it through — live", sub: "They challenge you, follow up, and don't let you off easy." },
];

export const SceneIntro: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = useSceneFade(durationInFrames, 2, 18);

  // Lights on: dark canvas warms to white over the first ~26 frames.
  const bg = interpolate(frame, [0, 26], [0, 1]);
  const bgColor = `rgb(${11 + (255 - 11) * bg}, ${11 + (255 - 11) * bg}, ${12 + (255 - 12) * bg})`;
  const dark = bg < 0.5;

  return (
    <AbsoluteFill style={{ background: bgColor, opacity, fontFamily: FONT.sans, color: C.ink }}>
      <Aura dark={dark} glow={!dark} />

      {/* Wordmark */}
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ ...reveal(frame, 8, 22), display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ boxShadow: SHADOW.md, borderRadius: 16, display: "inline-flex" }}>
            <BrandMark size={68} variant="room" uid="intro" />
          </span>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.04em", fontSize: 74, color: dark ? "#fff" : C.ink }}>
            Greenroom
          </span>
        </div>
        <div style={{ ...reveal(frame, 30, 22), fontSize: 31, fontWeight: 500, color: dark ? "rgba(255,255,255,0.7)" : C.inkSoft, maxWidth: 1180, textAlign: "center" }}>
          A voice-native room to practice <em style={{ fontStyle: "normal", color: C.verified }}>any hard conversation</em> — out loud,
          against someone who actually challenges you.
        </div>
      </div>

      {/* 3-step build */}
      <div style={{ position: "absolute", top: 330, left: 120, right: 120, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            style={{
              ...reveal(frame, 200 + i * 70, 30, 22),
              background: C.surfaceProduct,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: "30px 30px 34px",
              boxShadow: SHADOW.sm,
              minHeight: 240,
            }}
          >
            <div style={{ fontFamily: MONO_FALLBACK, fontSize: 26, color: C.verified, fontWeight: 500, marginBottom: 18 }}>{s.n}</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.02em", fontSize: 34, lineHeight: 1.12, marginBottom: 14 }}>
              {s.title}
            </div>
            <div style={{ fontSize: 23, color: C.muted, lineHeight: 1.4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <GroundedCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

// The Cala capability card — one sharp edge: where facts matter, grounded in cited sources.
const GroundedCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const start = 470;
  const o = interpolate(frame, [start, start + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [start, start + 26], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const chip = interpolate(frame, [start + 34, start + 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 86,
        left: 120,
        right: 120,
        opacity: o,
        transform: `translateY(${y}px)`,
        background: `linear-gradient(180deg, ${C.verifiedSoft} 0%, ${C.surfaceProduct} 42%)`,
        border: "1px solid rgba(28,138,78,0.34)",
        borderRadius: 20,
        boxShadow: SHADOW.accent,
        padding: "30px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 40,
      }}
    >
      <div style={{ maxWidth: 1080 }}>
        <Eyebrow color={C.verifiedDeep} style={{ fontSize: 19 }}>When the conversation turns on facts</Eyebrow>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.025em", fontSize: 42, marginTop: 12, lineHeight: 1.1 }}>
          Grounded in real, <span style={{ color: C.verified }}>cited sources</span> — so it holds you to what's true.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16, opacity: chip }}>
        <SourceChip mono={MONO_FALLBACK}>★ checked against the record</SourceChip>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 19, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          powered by
          <Img src={staticFile("cala-logo.png")} style={{ height: 22, width: "auto", opacity: 0.85 }} />
        </div>
      </div>
    </div>
  );
};
