// Greenroom brand mark — ported from app/components/brand-mark.tsx (voice-waveform tile).
// `uid` keeps gradient ids unique when multiple marks render in one frame.
import React from "react";

const BARS = [
  { x: 12, h: 22 }, { x: 30, h: 50 }, { x: 48, h: 74 }, { x: 66, h: 50 }, { x: 84, h: 28 },
];
const BAR_W = 10;
const ROOM_BARS = [
  { x: 29, h: 18 }, { x: 40, h: 34 }, { x: 51, h: 50 }, { x: 62, h: 34 }, { x: 73, h: 22 },
];
const ROOM_BAR_W = 6;
const DOORWAY = "M26 92 L26 42 Q26 26 42 26 L66 26 Q82 26 82 42 L82 92";

export function BrandMark({
  size = 24,
  variant = "wave",
  uid = "m",
}: {
  size?: number;
  variant?: "wave" | "room";
  uid?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" fill="none" role="img" aria-label="Greenroom">
      <defs>
        <linearGradient id={`gr-tile-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c8a4e" />
          <stop offset="100%" stopColor="#0f6b3a" />
        </linearGradient>
        <linearGradient id={`gr-sheen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="108" height="108" rx="28" fill={`url(#gr-tile-${uid})`} />
      <rect width="108" height="108" rx="28" fill={`url(#gr-sheen-${uid})`} />
      {variant === "room" ? (
        <>
          <path d={DOORWAY} stroke="#fff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <g fill="#fff">
            {ROOM_BARS.map((b) => (
              <rect key={b.x} x={b.x} y={64 - b.h / 2} width={ROOM_BAR_W} height={b.h} rx={ROOM_BAR_W / 2}
                fillOpacity={b.h > 48 ? 1 : b.h > 30 ? 0.92 : 0.78} />
            ))}
          </g>
        </>
      ) : (
        <g fill="#fff">
          {BARS.map((b) => (
            <rect key={b.x} x={b.x} y={54 - b.h / 2} width={BAR_W} height={b.h} rx={BAR_W / 2}
              fillOpacity={b.h > 70 ? 1 : b.h > 40 ? 0.92 : 0.78} />
          ))}
        </g>
      )}
    </svg>
  );
}
