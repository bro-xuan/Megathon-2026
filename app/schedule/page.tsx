"use client";

import { use, useState } from "react";
import Link from "next/link";

// Fake Cal-style booking (product theater). "Join now" launches the call immediately —
// there is no real time-triggered backend. On the critical path; cosmetic.
const DAYS = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27"];
const SLOTS = ["09:00", "09:30", "10:00", "11:00", "13:30", "14:00", "15:30", "16:00"];

export default function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target = "Stripe" } = use(searchParams);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const booked = day && slot;

  return (
    <main className="container-page py-[6rem] flex flex-col gap-[2.5rem] flex-1">
      <header className="flex flex-col gap-3">
        <Link href="/" className="label-eyebrow hover:text-ink w-fit">← Greenroom</Link>
        <h1 className="font-display text-[clamp(1.8rem,3vw,3rem)] leading-tight">
          Book your {target} interview
        </h1>
        <p className="text-muted">30 min · voice · with a Managing Director on {target} coverage.</p>
      </header>

      {!booked ? (
        <div className="grid gap-[1.5rem] md:grid-cols-2 max-w-[44rem]">
          <div className="card">
            <div className="label-eyebrow mb-3">Pick a day</div>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={day === d ? "btn-primary" : "btn-secondary"}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="label-eyebrow mb-3">Pick a time</div>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  disabled={!day}
                  onClick={() => setSlot(s)}
                  className={`${slot === s ? "btn-primary" : "btn-secondary"} ${!day ? "opacity-40" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-product max-w-[34rem] flex flex-col gap-3">
          <div className="label-eyebrow" style={{ color: "var(--verified)" }}>✓ Booked</div>
          <p className="text-[1.05rem]">
            Your interview with the {target} MD is booked for <strong>{day} at {slot}</strong>.
          </p>
          <p className="text-muted text-[0.85rem]">A calendar invite is on its way. Or skip the wait:</p>
          <div className="flex gap-3">
            <Link href={`/spar/${encodeURIComponent(target)}`} className="btn-primary">
              Join now →
            </Link>
            <Link href={`/study/${encodeURIComponent(target)}`} className="btn-secondary">
              Prep with the facts
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
