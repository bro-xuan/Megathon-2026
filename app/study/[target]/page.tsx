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
    <main className="flex-1 flex flex-col">
      <section className="hero-aura border-b border-border">
        <div className="container-page py-[3.5rem] flex flex-col gap-4 reveal">
          <Link href="/start" className="label-eyebrow hover:text-ink w-fit transition-colors">
            ← Choose partner
          </Link>
          <span className="label-eyebrow">Prep material</span>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="w-[3.5rem] h-[3.5rem] rounded-[0.9rem] avatar-ink flex items-center justify-center font-display text-[1.3rem] shadow-md">
              {pack.target.slice(0, 2)}
            </span>
            <h1 className="font-display text-[clamp(1.8rem,3.4vw,3rem)] leading-tight">
              {pack.target}
            </h1>
          </div>
          <p className="text-muted max-w-[48rem] text-[1.02rem] leading-relaxed">
            Study these before you go in. Every fact is grounded in Cala&apos;s cited data — click
            any chip to open the source. In a grounded interview, this is exactly what the AI grills
            you on and checks your answers against.
          </p>
          <div className="flex items-center gap-4 flex-wrap pt-1">
            <Link href="/spar/stock-pitch" className="btn-accent">
              Spar with the Managing Director →
            </Link>
            <span className="badge-live">
              {pack.facts.length} cited facts · {network.length} entities
            </span>
          </div>
        </div>
      </section>

      <div className="container-page py-[3rem] flex flex-col gap-[2.5rem]">
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
                  className="fact-value text-[0.8rem] border border-border rounded-full px-3 py-1 transition-colors hover:border-ink/40"
                  title={r.type}
                >
                  {r.to}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
