import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CapabilityBars, ClaimRow, FlagCard, ReadinessHero, TranscriptView } from "@/app/components/debrief";
import { CoverageGraph } from "@/app/components/coverage-graph";
import { buildCoverageGraph } from "@/lib/coverage-graph";
import { getFactPack } from "@/lib/factpack";
import type { CoverageGraph as CoverageGraphT, DebriefResult, TranscriptTurn } from "@/lib/types";

type Fixture = { target: string; transcript: TranscriptTurn[]; debrief: DebriefResult };

// Mock/fallback path: /debrief/mock-stripe renders data/mock/stripe.json instantly, offline.
// (Live path — fetch the Vapi transcript by callId, then POST /api/debrief — wires in at M2.)
async function loadFixture(callId: string): Promise<Fixture | null> {
  if (!callId.startsWith("mock-")) return null;
  const slug = callId.slice("mock-".length);
  const file = path.join(process.cwd(), "data", "mock", `${slug}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, "utf8")) as Fixture;
}

export default async function DebriefPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const fixture = await loadFixture(callId);
  if (!fixture) notFound();

  const { target, transcript, debrief } = fixture;

  // Build the coverage graph from the target's cached cited pack (offline, no Cala call).
  let graph: CoverageGraphT | null = null;
  try {
    const pack = await getFactPack(target);
    graph = buildCoverageGraph([pack], debrief);
  } catch {
    graph = null; // pack unavailable → skip the hero, the scorecard still renders
  }

  return (
    <main className="flex-1">
      <div className="container-page py-[4rem] flex flex-col gap-[2.5rem]">
        <header className="flex flex-col gap-3 reveal">
          <Link href="/" className="label-eyebrow hover:text-ink w-fit transition-colors">
            ← Greenroom
          </Link>
          <span className="label-eyebrow">Debrief · sample</span>
          <h1 className="font-display text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.04]">
            Your {target} interview, scored
          </h1>
          <p className="text-muted text-[1.02rem] max-w-[44rem]">
            <strong className="text-ink">{debrief.flags.length} bluff{debrief.flags.length === 1 ? "" : "s"} caught</strong>, all
            sourced. Every factual claim you made was checked against Cala&apos;s cited data.
          </p>
        </header>

        {debrief.dimensions && debrief.dimensions.length > 0 && (
          <>
            <ReadinessHero dimensions={debrief.dimensions} verdict={debrief.composureNote} tally={debrief} />
            <CapabilityBars dimensions={debrief.dimensions} />
          </>
        )}

        {debrief.flags.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-[1.35rem]">The catch — bluffs vs. cited data</h2>
            <p className="text-muted text-[0.85rem] -mt-1">
              Where you contradicted Cala&apos;s ground truth. Every correction is sourced.
            </p>
            <div className="grid gap-[1rem]">
              {debrief.flags.map((f, i) => (
                <FlagCard key={i} flag={f} index={i} />
              ))}
            </div>
          </section>
        )}

        {graph && <CoverageGraph graph={graph} />}

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[1.35rem]">Every claim, checked</h2>
          <p className="text-muted text-[0.85rem]">
            {debrief.verifiedCount} of {debrief.totalClaims} verified against a source — the
            wall of citations.
          </p>
          <ul className="card-product mt-1">
            {debrief.claims.map((c, i) => (
              <ClaimRow key={i} claim={c} />
            ))}
          </ul>
        </section>

        <details className="card">
          <summary className="font-display text-[1.1rem] cursor-pointer select-none">Full transcript</summary>
          <div className="mt-4">
            <TranscriptView transcript={transcript} />
          </div>
        </details>
      </div>
    </main>
  );
}
