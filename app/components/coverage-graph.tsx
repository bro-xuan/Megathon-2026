"use client";

import { useMemo, useRef, useState } from "react";
import type { CoverageGraph, GraphNode, NodeCoverage } from "@/lib/types";
import { SourceChip } from "@/app/components/facts";

// The post-call COVERAGE MAP: the Cala knowledge graph (company → cited fact-topics → the
// entities each topic names), every node colored by how the candidate handled it. The graph
// lives on the left; a "points detected" rail on the right spells out each finding (quote,
// correction, source) so you don't have to hover. Hovering either side highlights the other.

const COVERAGE: Record<NodeCoverage, { color: string; label: string }> = {
  verified: { color: "var(--verified)", label: "spoke precisely" },
  flagged: { color: "var(--flag)", label: "bluffed / wrong" },
  unverifiable: { color: "var(--flag-medium)", label: "unverifiable" },
  untouched: { color: "var(--muted)", label: "never addressed" },
};
// rail order: bluffs first (most important), then unverifiable, then the precise hits
const RANK: Record<NodeCoverage, number> = { flagged: 0, unverifiable: 1, verified: 2, untouched: 3 };

function fillFor(node: GraphNode): string {
  if (node.kind === "company") return "var(--ink)";
  if (node.coverage === "untouched") return "var(--surface-product)";
  return `color-mix(in srgb, ${COVERAGE[node.coverage].color} 18%, var(--surface-product))`;
}
function strokeFor(node: GraphNode): string {
  if (node.kind === "company") return "var(--ink)";
  if (node.coverage === "untouched") return "var(--border)";
  return COVERAGE[node.coverage].color;
}
function radiusFor(node: GraphNode): number {
  if (node.kind === "company") return 34;
  if (node.kind === "fact") return 12;
  return node.coverage === "untouched" ? 5 : 9;
}

export function CoverageGraph({ graph }: { graph: CoverageGraph }) {
  const [active, setActive] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const hasNetwork = graph.nodes.some((n) => n.kind !== "company");

  const findings = useMemo(
    () =>
      graph.nodes
        .filter((n) => n.kind !== "company" && n.coverage !== "untouched")
        .sort((a, b) => RANK[a.coverage] - RANK[b.coverage] || a.label.localeCompare(b.label)),
    [graph.nodes],
  );

  const nodes = graph.nodes.filter((n) => n.visible);
  const edges = graph.edges.filter((e) => byId.get(e.from)?.visible && byId.get(e.to)?.visible);
  const tipNode = active && tip ? byId.get(active) ?? null : null;

  function showTip(id: string, el: SVGGElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2 - w.left, 140), w.width - 140);
    setActive(id);
    setTip({ x, y: r.top - w.top });
  }
  function clear() {
    setActive(null);
    setTip(null);
  }

  return (
    <section className="card-product flex flex-col gap-4">
      <style>{`
        @keyframes cg-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes cg-fade { from { opacity: 0; } to { opacity: 1; } }
        .cg-node { transform-box: fill-box; transform-origin: center; animation: cg-pop 320ms cubic-bezier(.2,.8,.2,1) both; }
        .cg-edge { animation: cg-fade 420ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .cg-node, .cg-edge { animation: none; } }
      `}</style>

      <div>
        <div className="label-eyebrow">Coverage map</div>
        <p className="text-muted text-[0.85rem] mt-1">
          Cala&apos;s knowledge graph, lit by what you said — green where you were precise, red where you
          bluffed. Every lit node is itemized on the right.
        </p>
      </div>

      <div className="grid gap-[1.25rem] lg:grid-cols-[1.55fr_1fr]">
        {/* ── graph ── */}
        <div ref={wrapRef} className="relative w-full min-w-0">
          <ul className="flex flex-wrap gap-3 mb-2">
            {(Object.keys(COVERAGE) as NodeCoverage[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5 text-[0.72rem] text-muted">
                <span
                  className="inline-block w-[0.7rem] h-[0.7rem] rounded-full"
                  style={{
                    background:
                      k === "untouched"
                        ? "var(--surface-product)"
                        : `color-mix(in srgb, ${COVERAGE[k].color} 18%, var(--surface-product))`,
                    border: `1.5px solid ${k === "untouched" ? "var(--border)" : COVERAGE[k].color}`,
                  }}
                />
                {COVERAGE[k].label}
              </li>
            ))}
          </ul>

          <svg
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            width="100%"
            role="img"
            aria-label="Interview coverage graph"
            style={{ display: "block", maxHeight: "34rem", margin: "0 auto" }}
          >
            <defs>
              <filter id="cg-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {edges.map((e, i) => {
              const a = byId.get(e.from)!;
              const b = byId.get(e.to)!;
              const flagged = a.coverage === "flagged" || b.coverage === "flagged";
              const lit = a.coverage !== "untouched" || b.coverage !== "untouched";
              return (
                <line
                  key={i}
                  className="cg-edge"
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    flagged
                      ? "color-mix(in srgb, var(--flag) 45%, var(--border))"
                      : lit
                        ? "color-mix(in srgb, var(--ink) 22%, var(--border))"
                        : "var(--border)"
                  }
                  strokeWidth={lit ? 1.4 : 1}
                />
              );
            })}

            {nodes.map((n) =>
              n.coverage === "untouched" || n.kind === "company" ? null : (
                <circle
                  key={`g-${n.id}`}
                  cx={n.x}
                  cy={n.y}
                  r={radiusFor(n) + (active === n.id ? 11 : 7)}
                  fill={COVERAGE[n.coverage].color}
                  opacity={active === n.id ? 0.42 : 0.28}
                  filter="url(#cg-glow)"
                />
              ),
            )}

            {nodes.map((n) => {
              const r = radiusFor(n);
              const isActive = active === n.id;
              const showLabel = n.kind !== "entity" || n.coverage !== "untouched" || isActive;
              const labelText =
                n.kind === "company" ? n.label : truncate(n.label, n.kind === "fact" ? 18 : 20);
              const labelW = labelText.length * (n.kind === "fact" ? 7.4 : 6.4) + 12;
              // entity labels sit ABOVE the node, fact labels BELOW — keeps a parent fact's
              // label from colliding with its child entity's (e.g. Acquisitions ↔ Metronome).
              const ly = n.kind === "entity" ? n.y - r - 7 : n.y + r + 15;
              return (
                <g
                  key={n.id}
                  className="cg-node"
                  tabIndex={0}
                  aria-label={`${n.label} — ${COVERAGE[n.coverage].label}`}
                  onMouseEnter={(ev) => showTip(n.id, ev.currentTarget)}
                  onMouseLeave={clear}
                  onFocus={(ev) => showTip(n.id, ev.currentTarget)}
                  onBlur={clear}
                  style={{ cursor: "default" }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isActive ? r + 2 : r}
                    fill={fillFor(n)}
                    stroke={strokeFor(n)}
                    strokeWidth={n.kind === "company" ? 0 : isActive ? 2.5 : 1.6}
                  />
                  {n.kind === "company" ? (
                    <text
                      x={n.x}
                      y={n.y + 5}
                      textAnchor="middle"
                      fontSize={16}
                      fontFamily="var(--font-display), sans-serif"
                      fontWeight={700}
                      fill="#fff"
                      style={{ pointerEvents: "none", letterSpacing: "-0.02em" }}
                    >
                      {n.label}
                    </text>
                  ) : (
                    showLabel && (
                      <>
                        <rect
                          x={n.x - labelW / 2}
                          y={ly - 11}
                          width={labelW}
                          height={16}
                          rx={4}
                          fill="var(--surface-product)"
                          opacity={0.82}
                          style={{ pointerEvents: "none" }}
                        />
                        <text
                          x={n.x}
                          y={ly}
                          textAnchor="middle"
                          fontSize={n.kind === "fact" ? 12.5 : 11}
                          fontFamily="var(--font-mono), monospace"
                          fontWeight={n.kind === "fact" ? 500 : 400}
                          fill={n.coverage === "untouched" ? "var(--muted)" : "var(--ink)"}
                          style={{ pointerEvents: "none" }}
                        >
                          {labelText}
                        </text>
                      </>
                    )
                  )}
                </g>
              );
            })}
          </svg>

          {tipNode && tip && (
            <div
              className="absolute z-10 card-product"
              style={{
                left: tip.x,
                top: tip.y,
                transform: "translate(-50%, calc(-100% - 0.6rem))",
                width: "min(20rem, 82%)",
                pointerEvents: "none",
                padding: "0.8rem 0.9rem",
                boxShadow: "0 0.5rem 1.5rem color-mix(in srgb, var(--ink) 12%, transparent)",
              }}
            >
              <NodeDetail node={tipNode} />
            </div>
          )}
        </div>

        {/* ── points detected rail ── */}
        <aside className="flex flex-col lg:max-h-[34rem] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-2">
          <div className="flex items-baseline justify-between pb-1.5 mb-1 border-b border-border px-2">
            <div className="label-eyebrow">Points detected</div>
            <span className="text-muted text-[0.72rem]">{findings.length}</span>
          </div>
          {findings.length === 0 ? (
            <p className="text-muted text-[0.85rem] mt-2 px-2">No factual claims landed on a known topic.</p>
          ) : (
            <ul className="flex flex-col">
              {findings.map((n) => {
                const c = COVERAGE[n.coverage];
                const isActive = active === n.id;
                const ev = n.evidence[0];
                const tag =
                  n.coverage === "flagged" ? "bluff" : n.coverage === "verified" ? "precise" : "unsure";
                const src = n.sourceUrl || ev?.sourceUrl;
                return (
                  <li key={n.id}>
                    <div
                      tabIndex={0}
                      onMouseEnter={() => {
                        setActive(n.id);
                        setTip(null);
                      }}
                      onMouseLeave={clear}
                      onFocus={() => {
                        setActive(n.id);
                        setTip(null);
                      }}
                      onBlur={clear}
                      className="flex gap-2.5 items-start py-2 px-2 rounded-[0.5rem] cursor-default transition-colors outline-none"
                      style={{
                        background: isActive
                          ? `color-mix(in srgb, ${c.color} 8%, transparent)`
                          : "transparent",
                      }}
                    >
                      <span
                        className="mt-[0.32rem] w-[0.55rem] h-[0.55rem] rounded-full shrink-0 transition-shadow"
                        style={{
                          background: c.color,
                          boxShadow: isActive
                            ? `0 0 0 0.2rem color-mix(in srgb, ${c.color} 22%, transparent)`
                            : "none",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-[0.88rem] leading-tight truncate">
                            {n.label}
                          </span>
                          <span
                            className="ml-auto text-[0.6rem] font-semibold uppercase tracking-[0.1em] shrink-0"
                            style={{ color: c.color }}
                          >
                            {tag}
                          </span>
                        </div>
                        {ev?.quote && (
                          <p className="fact-value text-[0.74rem] text-muted truncate mt-0.5">
                            {ev.quote}
                          </p>
                        )}
                        {isActive && n.coverage === "flagged" && ev?.correctValue && (
                          <p className="text-[0.74rem] mt-1 leading-snug">
                            <span style={{ color: c.color }}>→ </span>
                            {ev.correctValue}
                          </p>
                        )}
                        {isActive && src && (
                          <div className="mt-1.5">
                            <SourceChip url={src} name={n.sourceName} />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem] border-t border-border pt-3">
        <Stat n={graph.stats.verified} color="var(--verified)" label="precise" />
        <span className="text-border">·</span>
        <Stat n={graph.stats.flagged} color="var(--flag)" label="bluffed" />
        <span className="text-border">·</span>
        <Stat n={graph.stats.unverifiable} color="var(--flag-medium)" label="unverifiable" />
        <span className="text-border">·</span>
        <Stat n={graph.stats.untouched} color="var(--muted)" label="untouched" />
        <span className="text-muted text-[0.78rem] ml-auto">
          {graph.nodes.filter((n) => n.kind === "entity").length} related entities ·{" "}
          {graph.nodes.filter((n) => n.kind === "fact").length} fact topics
        </span>
        {!hasNetwork && (
          <span className="text-muted text-[0.78rem]">Relationship network unavailable.</span>
        )}
      </div>
    </section>
  );
}

/** The hover-tooltip body for a node (fact value + the candidate's words + source). */
function NodeDetail({ node }: { node: GraphNode }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-[0.6rem] h-[0.6rem] rounded-full shrink-0"
          style={{ background: node.kind === "company" ? "var(--ink)" : COVERAGE[node.coverage].color }}
        />
        <span className="font-display text-[1rem] leading-tight">{node.label}</span>
        {node.entityType && <span className="text-muted text-[0.7rem]">· {node.entityType}</span>}
      </div>
      {node.kind !== "company" && (
        <div className="label-eyebrow mb-2" style={{ color: COVERAGE[node.coverage].color }}>
          {COVERAGE[node.coverage].label}
        </div>
      )}
      {node.value && <p className="text-[0.82rem] mb-2 leading-snug">{node.value}</p>}
      {node.evidence.slice(0, 2).map((ev, i) => (
        <div key={i} className="mb-2">
          <p className="fact-value text-[0.78rem]">&ldquo;{ev.quote}&rdquo;</p>
          {ev.verdict === "flagged" && ev.correctValue && (
            <p className="text-[0.76rem] mt-0.5">
              <span className="text-muted">Correct: </span>
              {ev.correctValue}
            </p>
          )}
        </div>
      ))}
      {node.evidence.length === 0 && node.kind !== "company" && (
        <p className="text-muted text-[0.76rem] mb-1">You didn&apos;t address this.</p>
      )}
      {(node.sourceUrl || node.evidence[0]?.sourceUrl) && (
        <SourceChip url={(node.sourceUrl || node.evidence[0]?.sourceUrl)!} name={node.sourceName} />
      )}
    </>
  );
}

function Stat({ n, color, label }: { n: number; color: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-display text-[1.1rem]" style={{ color }}>
        {n}
      </span>
      <span className="text-muted text-[0.8rem]">{label}</span>
    </span>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
