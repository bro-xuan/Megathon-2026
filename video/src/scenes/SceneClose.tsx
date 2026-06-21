// Scene 5 — the close. Mark, tagline, and the button line: Walk in ready. Prize credits below.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, Easing } from "remotion";
import { C, SHADOW } from "../theme";
import { FONT } from "../fonts";
import { Aura, reveal, useScaleIn, useSceneFade } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
import { MONO_FALLBACK } from "../components/tokens";

export const SceneClose: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = useSceneFade(durationInFrames, 16, 20);
  const readyScale = useScaleIn(58, fps, 0.86);
  const creditsO = interpolate(frame, [88, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.footer, opacity, fontFamily: FONT.sans, color: "#fff" }}>
      <Aura dark />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ ...reveal(frame, 8, 22), display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ boxShadow: SHADOW.accent, borderRadius: 22, display: "inline-flex" }}>
            <BrandMark size={96} variant="room" uid="close" />
          </span>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.04em", fontSize: 96 }}>Greenroom</span>
        </div>

        <div style={{ ...reveal(frame, 34, 20), fontSize: 36, fontWeight: 500, color: "rgba(255,255,255,0.74)" }}>
          Practice the conversation before it counts.
        </div>

        <div
          style={{
            transform: `scale(${readyScale})`,
            opacity: interpolate(frame, [58, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            fontFamily: FONT.display,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            fontSize: 132,
            lineHeight: 1.05,
            marginTop: 8,
            background: "linear-gradient(135deg, #1c8a4e 0%, #34c275 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Walk in ready.
        </div>
      </AbsoluteFill>

      {/* Prize credits */}
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: creditsO }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "rgba(255,255,255,0.7)", fontSize: 24 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            Grounded in <Img src={staticFile("cala-logo.png")} style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.85 }} />
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Voice by <strong style={{ color: "#fff", fontWeight: 600 }}>Vapi</strong></span>
        </div>
        <div style={{ fontFamily: MONO_FALLBACK, fontSize: 18, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>MEGATHON 2026</div>
      </div>
    </AbsoluteFill>
  );
};
