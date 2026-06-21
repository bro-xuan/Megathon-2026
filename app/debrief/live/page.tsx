"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CapabilityBars,
  ClaimRow,
  FlagCard,
  GeneralDebriefView,
  ReadinessHero,
  TranscriptView,
} from "@/app/components/debrief";
import { CoverageGraph } from "@/app/components/coverage-graph";
import { buildCoverageGraph } from "@/lib/coverage-graph";
import type { AnyDebrief, DebriefResult, GeneralDebrief, TranscriptTurn } from "@/lib/types";

type Stashed = {
  label: string;
  grounded: boolean;
  transcript: TranscriptTurn[];
  debrief: AnyDebrief;
};

// Live debrief: renders the result the Spar page stashed in sessionStorage after a real call.
// Grounded tracks → cited scorecard; ungrounded → delivery coaching. (The offline demo path is
// the server-rendered /debrief/mock-stripe.)
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

  const { label, transcript, debrief } = data;
  const isGeneral = debrief.mode === "general";

  return (
    <main className="flex-1">
      <div className="container-page py-[4rem] flex flex-col gap-[2.5rem]">
        <header className="flex flex-col gap-3 reveal">
          <Link href="/" className="label-eyebrow hover:text-ink w-fit transition-colors">← Greenroom</Link>
          <span className="label-eyebrow">Debrief · {isGeneral ? "delivery" : "cited"}</span>
          <h1 className="font-display text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.04]">
            Your {label} round, scored
          </h1>
          <p className="text-muted text-[1.02rem] max-w-[44rem]">
            {isGeneral ? (
              "Delivery review for this round — no fact-check (grounded tracks catch bluffs against cited data)."
            ) : (
              <>
                {(debrief as DebriefResult).flags.length} bluff
                {(debrief as DebriefResult).flags.length === 1 ? "" : "s"} caught, all sourced.
                Every factual claim you made was checked against Cala&apos;s cited sources.
              </>
            )}
          </p>
        </header>

        {isGeneral ? (
          <GeneralDebriefSection debrief={debrief as GeneralDebrief} />
        ) : (
          <CitedDebrief debrief={debrief as DebriefResult} />
        )}

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

function CitedDebrief({ debrief }: { debrief: DebriefResult }) {
  const graph = useMemo(
    () => (debrief.packs?.length ? buildCoverageGraph(debrief.packs, debrief) : null),
    [debrief],
  );
  const dims = debrief.dimensions ?? [];
  return (
    <>
      {dims.length > 0 && (
        <>
          <ReadinessHero dimensions={dims} verdict={debrief.composureNote} tally={debrief} />
          <CapabilityBars dimensions={dims} />
        </>
      )}

      {debrief.flags.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[1.35rem]">The catch — bluffs vs. cited data</h2>
          <p className="text-muted text-[0.85rem] -mt-1">
            Where you contradicted Cala&apos;s ground truth. Every correction is sourced.
          </p>
          <div className="grid gap-[1rem]">
            {debrief.flags.map((f, i) => <FlagCard key={i} flag={f} index={i} />)}
          </div>
        </section>
      )}

      {graph && <CoverageGraph graph={graph} />}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[1.35rem]">Every claim, checked</h2>
        <p className="text-muted text-[0.85rem]">
          {debrief.verifiedCount} of {debrief.totalClaims} verified against a source.
        </p>
        <ul className="card-product mt-1">
          {debrief.claims.map((c, i) => <ClaimRow key={i} claim={c} />)}
        </ul>
      </section>
    </>
  );
}

function GeneralDebriefSection({ debrief }: { debrief: GeneralDebrief }) {
  const dims = debrief.dimensions ?? [];
  return (
    <>
      {dims.length > 0 && (
        <>
          <ReadinessHero dimensions={dims} verdict={debrief.summary} />
          <CapabilityBars dimensions={dims} />
        </>
      )}
      <GeneralDebriefView debrief={debrief} />
    </>
  );
}
