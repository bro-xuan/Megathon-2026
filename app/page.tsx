import Link from "next/link";

// General entry. Vision-first, no interview-type jargon — the single action is "Get started",
// which leads to /start where you pick the kind of interview. (Two-step funnel, per UX reframe.)
const PILLARS = [
  {
    title: "Voice-native",
    body: "A real spoken rehearsal, not a chatbox. You talk; it listens and pushes back like a live interviewer.",
  },
  {
    title: "Grounded in cited data",
    body: "The moment you state something false, it catches you and shows the receipt — a real source link. A generic AI can't: it has no source of truth.",
  },
  {
    title: "Scored afterward",
    body: "A post-call debrief scores your answers and flags every bluff with the fact you got wrong and where it came from.",
  },
];

export default function Home() {
  return (
    <main className="container-page flex-1 flex flex-col justify-center py-[5rem] gap-[4rem]">
      {/* Hero — general framing, one primary action. */}
      <div className="flex flex-col gap-6 max-w-[54rem]">
        <span className="label-eyebrow">Greenroom</span>
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.03]">
          Rehearse any high-pressure conversation.
        </h1>
        <p className="text-muted text-[1.1rem] max-w-[44rem]">
          A voice rehearsal grounded in <strong className="text-ink">real, cited</strong> company
          data. It interviews you out loud, catches the moment you bluff a fact, and shows you the
          source you got wrong.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/start" className="btn-primary text-[1rem]">
            Get started →
          </Link>
          <Link href="/debrief/mock-stripe" className="btn-secondary text-[1rem]">
            See a sample debrief
          </Link>
        </div>
      </div>

      {/* Differentiator strip — fills the entry page without leaking the selector. */}
      <section className="grid gap-[1.5rem] sm:grid-cols-3 max-w-[60rem] border-t border-border pt-[3rem]">
        {PILLARS.map((p) => (
          <div key={p.title} className="flex flex-col gap-2">
            <h2 className="font-display text-[1.15rem]">{p.title}</h2>
            <p className="text-muted text-[0.9rem]">{p.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
