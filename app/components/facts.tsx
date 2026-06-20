import type { Fact } from "@/lib/types";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

/** A value + outbound citation. A citation is a first-class element (DESIGN §1). */
export function SourceChip({ url, name }: { url: string; name?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-chip"
      title={name ?? url}
    >
      <span aria-hidden>↗</span>
      {hostOf(url)}
    </a>
  );
}

/** One grounded fact: short claim label, mono value, and its source chip. */
export function FactRow({ fact }: { fact: Fact }) {
  return (
    <li className="flex flex-col gap-2 py-4 border-b border-border last:border-b-0">
      <span className="label-eyebrow">{fact.claim}</span>
      <p className="fact-value">{fact.value}</p>
      <div>
        <SourceChip url={fact.sourceUrl} name={fact.sourceName} />
      </div>
    </li>
  );
}

/** A grouped card of facts (Overview · People · Ownership · Recent — DESIGN §8.3). */
export function FactCard({ title, facts }: { title: string; facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <section className="card">
      <h2 className="font-display text-[1.25rem] mb-2">{title}</h2>
      <ul>
        {facts.map((f, i) => (
          <FactRow key={i} fact={f} />
        ))}
      </ul>
    </section>
  );
}
