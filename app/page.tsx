import Link from "next/link";

const TARGETS = [
  { name: "Stripe", blurb: "Private fintech giant. Pitch its valuation — carefully." },
  { name: "OpenAI", blurb: "Is it still private? Are you sure?" },
];

export default function Home() {
  return (
    <main className="container-page flex-1 flex flex-col justify-center py-[6rem] gap-[3rem]">
      <div className="flex flex-col gap-5 max-w-[52rem]">
        <span className="label-eyebrow">Greenroom · IB / Finance interview</span>
        <h1 className="font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1.05]">
          The mock interviewer that catches your bluffs.
        </h1>
        <p className="text-muted text-[1.05rem] max-w-[40rem]">
          A voice mock interview grounded in <strong className="text-ink">real, cited</strong>{" "}
          company data. Pitch a company out loud — when you state something false, it pushes
          back, then shows you the receipt with a source link.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="label-eyebrow">Pick a company to interview on</h2>
        <div className="grid gap-[1.5rem] sm:grid-cols-2 max-w-[48rem]">
          {TARGETS.map((t) => (
            <div key={t.name} className="card flex flex-col gap-3">
              <h3 className="font-display text-[1.4rem]">{t.name}</h3>
              <p className="text-muted text-[0.9rem] flex-1">{t.blurb}</p>
              <div className="flex gap-3 flex-wrap">
                <Link href={`/study/${encodeURIComponent(t.name)}`} className="btn-secondary">
                  See what we know
                </Link>
                <Link href={`/schedule?target=${encodeURIComponent(t.name)}`} className="btn-primary">
                  Book your interview →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
