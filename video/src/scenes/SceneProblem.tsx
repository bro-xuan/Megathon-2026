// Scene 1 — The Problem. Cold, dark, typographic. Lists the conversations you only get one shot
// at, then lands the reframe: there's no gym for the hardest thing we do — talk.
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { C } from "../theme";
import { FONT } from "../fonts";
import { Aura, reveal, useSceneFade } from "../components/ui";
import { MONO_FALLBACK } from "../components/tokens";

const STAKES = [
  { lead: "The raise", rest: " you've rehearsed a hundred times — in your head." },
  { lead: "The interview", rest: " that sets up the next four years." },
  { lead: "The conversation", rest: " you keep putting off." },
];

export const SceneProblem: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = useSceneFade(durationInFrames, 16, 18);

  // The list dominates the first ~2/3, then dims as the thesis takes over.
  const listFade = interpolate(frame, [300, 338], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const thesisStart = 344;

  return (
    <AbsoluteFill style={{ background: C.footer, opacity, fontFamily: FONT.sans }}>
      <Aura dark />
      <AbsoluteFill style={{ padding: "120px 150px", justifyContent: "center" }}>
        {/* Opening line */}
        <div style={{ ...reveal(frame, 18, 18), marginBottom: 54 }}>
          <span style={{ fontFamily: MONO_FALLBACK, fontSize: 24, letterSpacing: "0.04em", color: "rgba(255,255,255,0.55)" }}>
            Some conversations, you only get one shot at.
          </span>
        </div>

        {/* The stakes — staggered */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, opacity: listFade }}>
          {STAKES.map((s, i) => (
            <div key={i} style={reveal(frame, 66 + i * 60, 30, 22)}>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.03em", fontSize: 58, color: C.verified }}>
                {s.lead}
              </span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.03em", fontSize: 58, color: "rgba(255,255,255,0.92)" }}>
                {s.rest}
              </span>
            </div>
          ))}
        </div>

        {/* The reframe / thesis */}
        <Thesis frame={frame} start={thesisStart} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Thesis: React.FC<{ frame: number; start: number }> = ({ frame, start }) => {
  const o = interpolate(frame, [start, start + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const big = interpolate(frame, [start + 18, start + 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ position: "absolute", left: 150, right: 150, bottom: 150, opacity: o }}>
      <div style={{ fontFamily: FONT.sans, fontSize: 40, fontWeight: 500, color: "rgba(255,255,255,0.78)", marginBottom: 10 }}>
        We walk in cold — because there's no gym for the hardest thing we do.
      </div>
      <div
        style={{
          fontFamily: FONT.display,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          fontSize: 200,
          lineHeight: 1,
          background: "linear-gradient(135deg, #1c8a4e 0%, #34c275 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          transform: `translateY(${(1 - big) * 24}px)`,
          opacity: big,
        }}
      >
        Talk.
      </div>
    </div>
  );
};
