// Scene 3 — the live call (the hero beat). A faithful recreation of the spar room: the
// interviewer's speaking orb, the candidate's claim, and the moment a number doesn't hold up —
// caught on the record, cited.
//
// ── SWAP IN YOUR OWN RECORDING ──────────────────────────────────────────────────────────────
// Record yourself driving /spar, drop the file at video/public/demo-recording.mp4, set
// USE_REAL_RECORDING = true, and in scripts/voiceover.mjs set the `demo` scene vo to "" then
// re-run `npm run voiceover` (so the scene sizes to your clip and the bridge VO steps aside).
const USE_REAL_RECORDING = false;

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, OffthreadVideo, Easing } from "remotion";
import { C, SHADOW } from "../theme";
import { FONT } from "../fonts";
import { Aura, SpeakingOrb, LiveBadge, reveal, useSceneFade } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
import { MONO_FALLBACK } from "../components/tokens";

export const SceneDemo: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = useSceneFade(durationInFrames, 12, 16);

  if (USE_REAL_RECORDING) {
    return (
      <AbsoluteFill style={{ background: "#000", opacity }}>
        <OffthreadVideo src={staticFile("demo-recording.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <Chrome frame={frame} fps={fps} />
      </AbsoluteFill>
    );
  }

  // Emphasis: gently push in on the catch as it lands.
  const zoom = interpolate(frame, [150, 210], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const dim = interpolate(frame, [160, 195], [1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.canvasTint, opacity, fontFamily: FONT.sans, color: C.ink }}>
      <Aura glow />
      <Chrome frame={frame} fps={fps} />

      <AbsoluteFill style={{ top: 92, padding: "40px 110px 70px", display: "grid", gridTemplateColumns: "0.78fr 1fr", gap: 56, alignItems: "center" }}>
        {/* Interviewer side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, opacity: dim }}>
          <SpeakingOrb size={300} frame={frame} fps={fps} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.02em", fontSize: 38 }}>Marcus Halloway</div>
            <div style={{ fontSize: 24, color: C.muted, marginTop: 4 }}>Managing Director · knows the facts cold</div>
          </div>
        </div>

        {/* Transcript / the catch */}
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "center left" }}>
          {/* Interviewer question */}
          <div style={{ ...reveal(frame, 34, 22), display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <Img src={staticFile("portraits/stock-pitch.jpg")} style={{ width: 46, height: 46, borderRadius: 999, objectFit: "cover" }} />
            <span style={{ fontSize: 26, color: C.inkSoft }}>“And how big is OpenAI right now?”</span>
          </div>

          {/* Candidate claim */}
          <div style={{ ...reveal(frame, 78, 26), background: C.surfaceProduct, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 26px", boxShadow: SHADOW.sm, marginBottom: 22 }}>
            <div style={{ fontSize: 20, color: C.muted, marginBottom: 8 }}>You</div>
            <div style={{ fontFamily: MONO_FALLBACK, fontSize: 28, lineHeight: 1.4 }}>
              “Their last round valued it around{" "}
              <FlaggedNumber frame={frame}>$300 billion</FlaggedNumber>.”
            </div>
          </div>

          {/* The catch */}
          <CatchPanel frame={frame} fps={fps} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chrome: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pulse = (frame / fps / 1.8) % 1;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 92,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 70px",
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <BrandMark size={36} uid="demo" />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.03em", fontSize: 30 }}>Greenroom</span>
      </div>
      <LiveBadge mono={MONO_FALLBACK} pulse={pulse} />
    </div>
  );
};

const FlaggedNumber: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => {
  const flagged = frame >= 150;
  const t = interpolate(frame, [150, 168], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span
      style={{
        color: flagged ? C.flag : C.ink,
        textDecoration: flagged ? "line-through" : "none",
        textDecorationColor: `rgba(210,59,59,${0.55 * t})`,
        transition: "none",
      }}
    >
      {children}
    </span>
  );
};

const CatchPanel: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const start = 172;
  const o = interpolate(frame, [start, start + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [start, start + 22], [34, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const chip = interpolate(frame, [start + 30, start + 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity: o,
        transform: `translateY(${y}px)`,
        background: C.surfaceProduct,
        border: `1.5px solid rgba(210,59,59,0.4)`,
        borderRadius: 16,
        padding: "22px 26px",
        boxShadow: "0 18px 50px rgba(210,59,59,0.16)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <span style={{ fontFamily: MONO_FALLBACK, fontSize: 20, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.flag }}>
        ✕ bluff caught
      </span>
      <div style={{ fontSize: 28, lineHeight: 1.4 }}>
        <span style={{ color: C.muted }}>Correct: </span>
        <span style={{ fontFamily: MONO_FALLBACK, color: C.ink }}>$852B after its $122B round (early 2026)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: chip }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: MONO_FALLBACK,
            fontSize: 19,
            color: C.verifiedDeep,
            background: C.verifiedSoft,
            border: "1px solid rgba(28,138,78,0.30)",
            borderRadius: 999,
            padding: "5px 14px",
          }}
        >
          ↗ cnbc.com
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          caught by
          <Img src={staticFile("cala-logo.png")} style={{ height: 19, width: "auto", opacity: 0.85 }} />
        </span>
      </div>
    </div>
  );
};
