// Greenroom brand mark — a voice-waveform tile. Self-contained SVG (gradient baked in) so it
// renders crisp at any size and doubles as the favicon (see app/icon.svg). The bars echo an
// audio level meter — the most honest glyph for a voice-native product. Plain component, no
// hooks → works in server and client pages. Size via `size` (px) or `className`.

// Symmetric pyramid waveform, matching the picked direction (▁▅█▅▂). Heights tuned so the
// center bar breathes inside the tile's corner radius; outer bars slightly uneven so it reads
// as a live voice, not a static equalizer.
const BARS = [
  { x: 12, h: 22 },
  { x: 30, h: 50 },
  { x: 48, h: 74 },
  { x: 66, h: 50 },
  { x: 84, h: 28 },
];
const BAR_W = 10;

// Room variant compresses the same waveform to ~76% and wraps it in an open doorway/portal —
// the "green·room" you step into before the stage, with the live voice happening inside it.
const ROOM_BARS = [
  { x: 29, h: 18 },
  { x: 40, h: 34 },
  { x: 51, h: 50 },
  { x: 62, h: 34 },
  { x: 73, h: 22 },
];
const ROOM_BAR_W = 6;
// Doorway: vertical jambs + a soft squared top, bottom left open (a threshold, not a sealed box —
// and squarer than a semicircle so it reads architectural, not like a headband).
const DOORWAY = "M26 92 L26 42 Q26 26 42 26 L66 26 Q82 26 82 42 L82 92";

export function BrandMark({
  size = 24,
  variant = "wave",
  className = "",
  title = "Greenroom",
}: {
  size?: number;
  variant?: "wave" | "room";
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id="gr-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c8a4e" />
          <stop offset="100%" stopColor="#0f6b3a" />
        </linearGradient>
        {/* faint top-left sheen — gives the flat tile a little dimensional life */}
        <linearGradient id="gr-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="108" height="108" rx="28" fill="url(#gr-tile)" />
      <rect x="0" y="0" width="108" height="108" rx="28" fill="url(#gr-sheen)" />

      {variant === "room" ? (
        <>
          {/* the room: an open doorway framing the voice */}
          <path
            d={DOORWAY}
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <g fill="#ffffff">
            {ROOM_BARS.map((b) => (
              <rect
                key={b.x}
                x={b.x}
                y={64 - b.h / 2}
                width={ROOM_BAR_W}
                height={b.h}
                rx={ROOM_BAR_W / 2}
                fillOpacity={b.h > 48 ? 1 : b.h > 30 ? 0.92 : 0.78}
              />
            ))}
          </g>
        </>
      ) : (
        <g fill="#ffffff">
          {BARS.map((b) => (
            <rect
              key={b.x}
              x={b.x}
              y={54 - b.h / 2}
              width={BAR_W}
              height={b.h}
              rx={BAR_W / 2}
              // center bar at full white; flanks slightly translucent → depth, not flat
              fillOpacity={b.h > 70 ? 1 : b.h > 40 ? 0.92 : 0.78}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
