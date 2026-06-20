import Link from "next/link";
import { notFound } from "next/navigation";
import { getFactPack } from "@/lib/factpack";
import { FactCard } from "@/app/components/facts";
import type { Fact, FactCategory } from "@/lib/types";

const GROUPS: { key: FactCategory; title: string }[] = [
  { key: "overview", title: "Overview" },
  { key: "people", title: "People" },
  { key: "ownership", title: "Ownership & Funding" },
  { key: "recent", title: "Recent activity" },
];

export default async function StudyPage({
  params,
}: {
  params: Promise<{ target: string }>;
}) {
  const { target } = await params;

  let pack;
  try {
    pack = await getFactPack(decodeURIComponent(target));
  } catch {
    notFound();
  }
  if (!pack || pack.facts.length === 0) notFound();

  const byGroup = (key: FactCategory): Fact[] =>
    pack.facts.filter((f) => (f.category ?? "overview") === key);

  // Distinct related entities (the network Cala supplies; graph is cut-able → list view).
  const network = Array.from(new Map(pack.relationships.map((r) => [r.to, r])).values());

  return (
    <main className="container-page py-[6rem] flex flex-col gap-[3rem]">
      <header className="flex flex-col gap-4">
        <Link href="/" className="label-eyebrow hover:text-ink w-fit">
          ← Greenroom
        </Link>
        <span className="label-eyebrow">Prep material</span>
        <h1 className="font-display text-[clamp(1.8rem,3vw,3rem)] leading-tight">
          {pack.target}
        </h1>
        <p className="text-muted max-w-[48rem]">
          Study these before you go in. Every fact is grounded in Cala&apos;s cited data — click
          any chip to open the source. In a grounded interview, this is exactly what the AI grills
          you on and checks your answers against.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="label-eyebrow">
            {pack.facts.length} cited facts · {network.length} entities in the network
          </span>
          <Link href="/spar/stock-pitch" className="btn-primary">
            Spar with the Managing Director →
          </Link>
        </div>
      </header>

      <div className="grid gap-[1.5rem] md:grid-cols-2">
        {GROUPS.map((g) => (
          <FactCard key={g.key} title={g.title} facts={byGroup(g.key)} />
        ))}
      </div>

      {network.length > 0 && (
        <section className="card-product">
          <h2 className="font-display text-[1.25rem] mb-1">Relationship network</h2>
          <p className="text-muted text-[0.85rem] mb-4">
            Entities connected to {pack.target} in Cala&apos;s graph — owners, funders, board,
            competitors. The interviewer probes these.
          </p>
          <ul className="flex flex-wrap gap-2">
            {network.slice(0, 40).map((r) => (
              <li
                key={r.to}
                className="fact-value text-[0.8rem] border border-border rounded-full px-3 py-1"
                title={r.type}
              >
                {r.to}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
