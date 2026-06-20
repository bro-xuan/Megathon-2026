"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClaimRow, FlagCard, ScorePanel, TranscriptView } from "@/app/components/debrief";
import type { DebriefResult, TranscriptTurn } from "@/lib/types";

type Stashed = { target: string; transcript: TranscriptTurn[]; debrief: DebriefResult };

// Live debrief: renders the result the Spar page stashed in sessionStorage after a real call.
// (The offline demo path is the server-rendered /debrief/mock-stripe.)
export default function LiveDebriefPage() {
  const [data, setData] = useState<Stashed | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("greenroom:debrief");
    if (raw) setData(JSON.parse(raw) as Stashed);
    else setMissing(true);
  }, []);

  if (missing) {
    return (
      <main className="container-page py-[6rem]">
        <p className="text-muted">
          No debrief in this session.{" "}
          <Link href="/" className="underline">Start an interview</Link>.
        </p>
      </main>
    );
  }
  if (!data) return <main className="container-page py-[6rem]" />;

  const { target, transcript, debrief } = data;
  return (
    <main className="flex-1">
      <div className="container-page py-[6rem] flex flex-col gap-[2.5rem]">
        <header className="flex flex-col gap-3">
          <Link href="/" className="label-eyebrow hover:text-ink w-fit">← Greenroom</Link>
          <h1 className="font-display text-[clamp(1.8rem,3vw,3rem)] leading-tight">
            Debrief — {target} interview
          </h1>
          <p className="text-muted">
            {debrief.flags.length} bluff{debrief.flags.length === 1 ? "" : "s"} caught, all
            sourced. Every factual claim you made was checked against Cala&apos;s cited data.
          </p>
        </header>

        <ScorePanel debrief={debrief} />

        {debrief.flags.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-[1.3rem]">Bluffs caught</h2>
            <div className="grid gap-[1rem]">
              {debrief.flags.map((f, i) => <FlagCard key={i} flag={f} />)}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[1.3rem]">Every claim, checked</h2>
          <p className="text-muted text-[0.85rem]">
            {debrief.verifiedCount} of {debrief.totalClaims} verified against a source.
          </p>
          <ul className="card-product mt-1">
            {debrief.claims.map((c, i) => <ClaimRow key={i} claim={c} />)}
          </ul>
        </section>

        {transcript.length > 0 && (
          <details className="card">
            <summary className="font-display text-[1.1rem] cursor-pointer">Full transcript</summary>
            <div className="mt-4"><TranscriptView transcript={transcript} /></div>
          </details>
        )}
      </div>
    </main>
  );
}
