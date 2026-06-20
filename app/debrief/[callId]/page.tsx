import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimRow, FlagCard, ScorePanel, TranscriptView } from "@/app/components/debrief";
import type { DebriefResult, TranscriptTurn } from "@/lib/types";

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

  return (
    <main className="flex-1">
      <div className="container-page py-[6rem] flex flex-col gap-[2.5rem]">
        <header className="flex flex-col gap-3">
          <Link href="/" className="label-eyebrow hover:text-ink w-fit">
            ← Greenroom
          </Link>
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
              {debrief.flags.map((f, i) => (
                <FlagCard key={i} flag={f} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[1.3rem]">Every claim, checked</h2>
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
          <summary className="font-display text-[1.1rem] cursor-pointer">Full transcript</summary>
          <div className="mt-4">
            <TranscriptView transcript={transcript} />
          </div>
        </details>
      </div>

      <footer className="bg-footer text-white">
        <div className="container-page py-[3rem] text-[0.85rem] text-white/70">
          Grounded in Cala.ai cited data · Voice by Vapi · Greenroom
        </div>
      </footer>
    </main>
  );
}
