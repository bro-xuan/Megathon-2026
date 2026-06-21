// Shared visual primitives + motion helpers, styled from the Greenroom design system.
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring, Easing } from "remotion";
import { C, FONT_FALLBACK } from "./tokens";

// ── Motion helpers ────────────────────────────────────────────────────────────────────────────

/** Scene-level fade: gentle fade-in over the first frames, fade-out at the tail. */
export function useSceneFade(durationInFrames: number, inFrames = 14, outFrames = 14): number {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [0, inFrames, durationInFrames - outFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/** A staggered "fade-up + settle" reveal. Returns inline style. Pass the local frame. */
export function reveal(frame: number, start: number, dist = 26, dur = 18): React.CSSProperties {
  const o = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [start, start + dur], [dist, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: o, transform: `translateY(${y}px)` };
}

/** Spring-driven scale-in for cards/emphasis. */
export function useScaleIn(start: number, fps: number, from = 0.92): number {
  const frame = useCurrentFrame();
  const s = spring({ frame: frame - start, fps, config: { damping: 200, mass: 0.6 }, durationInFrames: 22 });
  return from + (1 - from) * s;
}

// ── Backgrounds ───────────────────────────────────────────────────────────────────────────────

/** Ambient dotted grid + soft green glow — ports the product's .hero-aura, light or dark. */
export function Aura({ dark = false, glow = true }: { dark?: boolean; glow?: boolean }) {
  const dot = dark ? "rgba(255,255,255,0.07)" : "rgba(12,12,13,0.09)";
  return (
    <>
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: dark
              ? "radial-gradient(60% 55% at 22% 12%, rgba(28,138,78,0.22), transparent 70%), radial-gradient(45% 45% at 88% 90%, rgba(28,138,78,0.10), transparent 70%)"
              : "radial-gradient(60% 55% at 18% 0%, rgba(28,138,78,0.14), transparent 70%), radial-gradient(45% 45% at 92% 8%, rgba(12,12,13,0.06), transparent 70%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${dot} 1.4px, transparent 1.4px)`,
          backgroundSize: "30px 30px",
          maskImage: "radial-gradient(75% 70% at 40% 30%, #000 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(75% 70% at 40% 30%, #000 0%, transparent 78%)",
          opacity: dark ? 0.6 : 0.5,
        }}
      />
    </>
  );
}

// ── Chips & labels ──────────────────────────────────────────────────────────────────────────────

export function Eyebrow({ children, color = C.muted, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase", color, fontWeight: 600, ...style }}>
      {children}
    </span>
  );
}

export function SourceChip({ children, mono }: { children: React.ReactNode; mono?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: mono,
        fontSize: 18,
        color: C.verifiedDeep,
        background: C.verifiedSoft,
        border: "1px solid rgba(28,138,78,0.30)",
        borderRadius: 999,
        padding: "5px 14px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function LiveBadge({ mono, pulse = 1 }: { mono?: string; pulse?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: mono, fontSize: 19, color: C.verifiedDeep }}>
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: 999,
          background: C.verified,
          boxShadow: `0 0 0 ${6 * pulse}px rgba(28,138,78,${0.45 * (1 - pulse)})`,
        }}
      />
      grounded in cited sources
    </span>
  );
}

// ── Speaking orb — concentric green rings rippling out while the interviewer talks ──
export function SpeakingOrb({ size = 240, frame, fps }: { size?: number; frame: number; fps: number }) {
  const breathe = 1 + 0.035 * Math.sin((frame / fps) * Math.PI * 2 * 0.8);
  const rings = [0, 0.33, 0.66].map((phase) => {
    const t = ((frame / fps / 2.4 + phase) % 1);
    return { scale: 1 + t * 0.9, opacity: 0.55 * (1 - t) };
  });
  return (
    <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center" }}>
      {rings.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: "2px solid rgba(28,138,78,0.45)",
            transform: `scale(${r.scale})`,
            opacity: r.opacity,
          }}
        />
      ))}
      <div
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: 999,
          background: "linear-gradient(145deg, #1c8a4e 0%, #0f6b3a 100%)",
          boxShadow: "0 18px 60px rgba(28,138,78,0.45)",
          transform: `scale(${breathe})`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <WaveBars frame={frame} fps={fps} color="#fff" height={size * 0.26} />
      </div>
    </div>
  );
}

/** Live audio-meter bars. */
export function WaveBars({ frame, fps, color, height = 60, bars = 5, width }: { frame: number; fps: number; color: string; height?: number; bars?: number; width?: number }) {
  const bw = width ?? height * 0.16;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: bw * 0.7, height }}>
      {Array.from({ length: bars }).map((_, i) => {
        const t = (frame / fps) * 2 * Math.PI;
        const h = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.9 + i * 0.35) + i));
        return <div key={i} style={{ width: bw, height: `${h * 100}%`, background: color, borderRadius: bw, opacity: 0.85 + 0.15 * h }} />;
      })}
    </div>
  );
}

export { FONT_FALLBACK };
