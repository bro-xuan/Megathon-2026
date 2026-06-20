// Interviewer avatar — shows a real portrait when we have one, else a gradient-initials chip.
// Plain component (no hooks) so it works in both server and client pages. Size + text scale come
// from the caller via `className` (e.g. "w-[2.8rem] h-[2.8rem] text-[0.9rem]").

export function Avatar({
  src,
  initials,
  accent = false,
  className = "",
}: {
  src?: string;
  initials: string;
  accent?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <span
        className={`relative overflow-hidden rounded-full shadow-sm bg-surface border border-border ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={`rounded-full flex items-center justify-center font-display shadow-sm ${
        accent ? "avatar-accent" : "avatar-ink"
      } ${className}`}
    >
      {initials}
    </span>
  );
}
