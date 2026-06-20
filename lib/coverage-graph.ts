// Build the post-call COVERAGE GRAPH from Cala data + the debrief. ISOMORPHIC — no Node
// APIs, safe to import in a client component. The graph is the Cala knowledge graph
// (company → cited fact-topics → the related entities each topic names) overlaid with how the
// candidate handled each node: verified (green), flagged (red), unverifiable (amber), untouched.
//
// Entities are attached to the fact-topic that mentions them (investors → Investors,
// competitors → Competitors, acquisitions → Acquisitions, …) so the graph reads as clustered
// structure rather than a flat star. Positions come from a small deterministic force layout.
//
// Claim → node mapping runs in three layers (see resolveNodeId):
//   1. the debrief LLM's own `nodeId` (primary; ids come from the SAME builders used in the
//      prompt catalog — lib/debrief.ts imports them from here so they always match);
//   2. deterministic fallback (fact sourceUrl match, then entity-name substring in the quote);
//   3. fact-label keyword in the quote (last resort).

import type {
  ClaimCheck,
  CoverageGraph,
  DebriefResult,
  FactPack,
  GraphEdge,
  GraphNode,
  NodeCoverage,
  NodeEvidence,
} from './types';

// ── id builders (shared with lib/debrief.ts so prompt ids == graph ids) ──────

function slugId(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Drop punctuation + common corporate suffixes so "GOLDMAN SACHS GROUP INC" ≍ "goldman sachs". */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(
      /\b(inc|llc|l l c|ltd|limited|corp|corporation|plc|group|partners|management|holdings|company|co)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function nodeIdForCompany(target: string): string {
  return `company:${slugId(target)}`;
}
export function nodeIdForFact(company: string, label: string): string {
  return `fact:${slugId(company)}:${slugId(label)}`;
}
export function nodeIdForEntity(name: string): string {
  return `entity:${slugId(normName(name))}`;
}

/** All-caps source/entity names → Title Case for display; leave mixed-case names alone. */
function pretty(name: string): string {
  if (/[a-z]/.test(name)) return name;
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bInc\b/g, 'Inc');
}

// ── per-pack node entries (shared by the prompt catalog and the graph builder) ──

export type FactEntry = {
  id: string;
  company: string;
  label: string;
  value: string;
  sourceUrl: string;
  sourceUrls: string[];
  sourceName?: string;
};

/** One fact node per (company, label), merging Cala's duplicate-label facts (e.g. Acquisitions). */
export function factEntries(pack: FactPack): FactEntry[] {
  const byLabel = new Map<string, FactEntry>();
  for (const f of pack.facts) {
    const id = nodeIdForFact(pack.target, f.claim);
    const existing = byLabel.get(id);
    if (existing) {
      if (f.value.length > existing.value.length) existing.value = f.value; // keep the richest
      if (f.sourceUrl && !existing.sourceUrls.includes(f.sourceUrl)) existing.sourceUrls.push(f.sourceUrl);
    } else {
      byLabel.set(id, {
        id,
        company: pack.target,
        label: f.claim,
        value: f.value,
        sourceUrl: f.sourceUrl,
        sourceUrls: f.sourceUrl ? [f.sourceUrl] : [],
        sourceName: f.sourceName,
      });
    }
  }
  return [...byLabel.values()];
}

export type EntityEntry = {
  id: string;
  name: string;
  type: string;
  companies: string[]; // target names this entity is linked to (>1 = shared backer/partner)
};

/** Distinct related entities across all packs. Entities that are themselves a loaded company
 *  (e.g. "OpenAI" in Stripe's network) are dropped here and become company↔company edges. */
export function entityEntries(packs: FactPack[]): EntityEntry[] {
  const companyNorms = new Set(packs.map((p) => normName(p.target)));
  const byId = new Map<string, EntityEntry>();
  for (const pack of packs) {
    for (const r of pack.relationships) {
      const norm = normName(r.to);
      if (!norm || norm.length < 2) continue;
      if (companyNorms.has(norm)) continue; // self ("Stripe, Inc.") or another center ("OpenAI")
      const id = nodeIdForEntity(r.to);
      const existing = byId.get(id);
      if (existing) {
        if (!existing.companies.includes(pack.target)) existing.companies.push(pack.target);
      } else {
        byId.set(id, { id, name: pretty(r.to), type: r.type, companies: [pack.target] });
      }
    }
  }
  return [...byId.values()];
}

// ── claim → node resolution ──────────────────────────────────────────────────

function resolveNodeId(
  claim: { nodeId?: string; sourceUrl?: string; quote: string },
  facts: FactEntry[],
  entities: EntityEntry[],
  idSet: Set<string>,
): string | null {
  // Layer 1 — the LLM told us, and it's a real node.
  if (claim.nodeId && idSet.has(claim.nodeId)) return claim.nodeId;

  // Layer 2a — fact sourceUrl match (skip bare homepages shared by many facts).
  if (claim.sourceUrl) {
    const matches = facts.filter((f) => f.sourceUrls.includes(claim.sourceUrl!));
    if (matches.length === 1) return matches[0].id;
  }

  const q = normName(claim.quote);

  // Layer 2b — entity name appears in the quote (longest, most specific name wins).
  let bestEntity: { id: string; len: number } | null = null;
  for (const e of entities) {
    const n = normName(e.name);
    if (n.length >= 4 && q.includes(n) && (!bestEntity || n.length > bestEntity.len)) {
      bestEntity = { id: e.id, len: n.length };
    }
  }
  if (bestEntity) return bestEntity.id;

  // Layer 3 — fact label word in the quote (only contentful labels, unique match).
  const labelHits = facts.filter((f) => {
    const w = f.label.toLowerCase();
    return w.length >= 5 && new RegExp(`\\b${w}`).test(q);
  });
  if (labelHits.length === 1) return labelHits[0].id;

  return null;
}

const COVERAGE_RANK: Record<NodeCoverage, number> = {
  flagged: 3, // worst-wins: a bluff is never hidden behind a correct mention
  verified: 2,
  unverifiable: 1,
  untouched: 0,
};

/** Which fact-topic (if any) names this entity in its prose → the entity's parent in the tree. */
function parentFactFor(entity: EntityEntry, facts: FactEntry[]): FactEntry | null {
  const n = normName(entity.name);
  if (n.length < 3) return null;
  let best: FactEntry | null = null;
  for (const f of facts) {
    if (f.company !== entity.companies[0]) continue;
    if (normName(f.value).includes(n)) {
      // prefer the most specific topic (shortest prose) when several mention it
      if (!best || f.value.length < best.value.length) best = f;
    }
  }
  return best;
}

// ── deterministic force-directed layout (Fruchterman–Reingold, zero-dep) ─────

const W = 1040;
const H = 720;

/** Lay nodes out organically. Company centers are anchored to `targets`; the rest settle by
 *  spring (edges) + repulsion (all pairs). Seeded deterministically so the demo is stable. */
function forceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  targets: Map<string, { x: number; y: number }>,
): void {
  const n = nodes.length;
  if (n === 0) return;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));

  // deterministic seed: anchors at target, others on a golden-angle spiral around center
  nodes.forEach((nd, i) => {
    const t = targets.get(nd.id);
    if (t) {
      nd.x = t.x;
      nd.y = t.y;
    } else {
      const ang = i * 2.39996; // golden angle → even spread, no clumping
      const rad = 36 + 13 * Math.sqrt(i);
      nd.x = W / 2 + rad * Math.cos(ang);
      nd.y = H / 2 + rad * Math.sin(ang);
    }
  });

  const k = 0.62 * Math.sqrt((W * H) / n); // ideal edge length
  const disp = nodes.map(() => ({ x: 0, y: 0 }));
  let temp = W / 6;
  const ITER = 340;

  for (let it = 0; it < ITER; it++) {
    for (let i = 0; i < n; i++) {
      disp[i].x = 0;
      disp[i].y = 0;
    }
    // repulsion between every pair
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let d = Math.hypot(dx, dy) || 0.01;
        if (d > 360) continue; // far pairs barely interact → cheaper, tighter clusters
        const f = (k * k) / d;
        const ux = dx / d;
        const uy = dy / d;
        disp[i].x += ux * f;
        disp[i].y += uy * f;
        disp[j].x -= ux * f;
        disp[j].y -= uy * f;
      }
    }
    // attraction along edges
    for (const e of edges) {
      const a = idx.get(e.from);
      const b = idx.get(e.to);
      if (a == null || b == null) continue;
      const dx = nodes[a].x - nodes[b].x;
      const dy = nodes[a].y - nodes[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = (d * d) / k;
      const ux = dx / d;
      const uy = dy / d;
      disp[a].x -= ux * f;
      disp[a].y -= uy * f;
      disp[b].x += ux * f;
      disp[b].y += uy * f;
    }
    // integrate
    for (let i = 0; i < n; i++) {
      const t = targets.get(nodes[i].id);
      if (t) {
        nodes[i].x += (t.x - nodes[i].x) * 0.25; // anchor centers
        nodes[i].y += (t.y - nodes[i].y) * 0.25;
        continue;
      }
      const dd = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      const lim = Math.min(dd, temp);
      nodes[i].x += (disp[i].x / dd) * lim;
      nodes[i].y += (disp[i].y / dd) * lim;
      nodes[i].x += (W / 2 - nodes[i].x) * 0.012; // mild gravity keeps it centered
      nodes[i].y += (H / 2 - nodes[i].y) * 0.012;
    }
    temp *= 0.975;
  }

  // fit to the viewBox with padding
  const pad = 70;
  const xs = nodes.map((nd) => nd.x);
  const ys = nodes.map((nd) => nd.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (W - 2 * pad) / Math.max(1, maxX - minX);
  const sy = (H - 2 * pad) / Math.max(1, maxY - minY);
  const s = Math.min(sx, sy);
  const ox = (W - s * (maxX - minX)) / 2;
  const oy = (H - s * (maxY - minY)) / 2;
  for (const nd of nodes) {
    nd.x = ox + (nd.x - minX) * s;
    nd.y = oy + (nd.y - minY) * s;
  }
}

export function buildCoverageGraph(packs: FactPack[], debrief: DebriefResult): CoverageGraph {
  const valid = packs.filter((p) => p && p.target);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const byId = new Map<string, GraphNode>();
  const add = (nd: GraphNode) => {
    nodes.push(nd);
    byId.set(nd.id, nd);
  };

  const base = (id: string, kind: GraphNode['kind'], label: string, company: string): GraphNode => ({
    id,
    kind,
    label,
    company,
    coverage: 'untouched',
    evidence: [],
    x: 0,
    y: 0,
    visible: true,
  });

  // company centers + their anchor targets
  const C = valid.length;
  const targets = new Map<string, { x: number; y: number }>();
  valid.forEach((p, i) => {
    const id = nodeIdForCompany(p.target);
    add(base(id, 'company', p.target, p.target));
    const x = C <= 1 ? W / 2 : W * (0.3 + (0.4 * i) / (C - 1));
    targets.set(id, { x, y: H / 2 });
  });
  const centers = valid.map((p) => nodeIdForCompany(p.target));

  // fact nodes
  const allFacts: FactEntry[] = [];
  for (const p of valid) {
    const cid = nodeIdForCompany(p.target);
    for (const f of factEntries(p)) {
      allFacts.push(f);
      const nd = base(f.id, 'fact', f.label, p.target);
      nd.value = f.value;
      nd.sourceUrl = f.sourceUrl;
      nd.sourceName = f.sourceName;
      add(nd);
      edges.push({ from: cid, to: f.id, kind: 'fact' });
    }
  }

  // company ↔ company edges (e.g. Stripe lists OpenAI as a partner)
  const companyByNorm = new Map(valid.map((p) => [normName(p.target), p.target] as const));
  for (const pack of valid) {
    for (const r of pack.relationships) {
      const other = companyByNorm.get(normName(r.to));
      if (other && other !== pack.target) {
        edges.push({ from: nodeIdForCompany(pack.target), to: nodeIdForCompany(other), kind: 'relationship' });
      }
    }
  }

  // entity nodes, each parented to the fact-topic that names it (else to its company center)
  const entities = entityEntries(valid);
  for (const e of entities) {
    if (byId.has(e.id)) continue;
    const nd = base(e.id, 'entity', e.name, e.companies.length > 1 ? '' : e.companies[0]);
    nd.entityType = e.type;
    add(nd);
    if (e.companies.length > 1) {
      for (const c of e.companies) edges.push({ from: nodeIdForCompany(c), to: e.id, kind: 'relationship' });
    } else {
      const parent = parentFactFor(e, allFacts);
      edges.push({ from: parent ? parent.id : nodeIdForCompany(e.companies[0]), to: e.id, kind: 'relationship' });
    }
  }

  // ── overlay coverage from the debrief ──
  const idSet = new Set(byId.keys());
  const applyClaim = (claim: {
    nodeId?: string;
    sourceUrl?: string;
    quote: string;
    verdict: ClaimCheck['verdict'];
    correctValue?: string;
  }) => {
    const id = resolveNodeId(claim, allFacts, entities, idSet);
    if (!id) return;
    const node = byId.get(id);
    if (!node || node.kind === 'company') return; // never recolor a center
    if (COVERAGE_RANK[claim.verdict] > COVERAGE_RANK[node.coverage]) node.coverage = claim.verdict;
    const ev: NodeEvidence = {
      quote: claim.quote,
      verdict: claim.verdict,
      correctValue: claim.correctValue,
      sourceUrl: claim.sourceUrl,
    };
    if (!node.evidence.some((x) => x.quote === ev.quote)) node.evidence.push(ev);
  };
  for (const c of debrief.claims ?? []) applyClaim(c);

  // lay it out, then tight-crop the viewBox to the content (no dead letterbox space)
  forceLayout(nodes, edges, targets);
  let width = W;
  let height = H;
  if (nodes.length) {
    const pad = 56;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    for (const n of nodes) {
      n.x += pad - minX;
      n.y += pad - minY;
    }
    width = maxX - minX + 2 * pad;
    height = maxY - minY + 2 * pad;
  }

  const stats = { verified: 0, flagged: 0, unverifiable: 0, untouched: 0 };
  for (const n of nodes) {
    if (n.kind === 'company') continue;
    stats[n.coverage]++;
  }

  return { nodes, edges, centers, width, height, hiddenCount: 0, stats };
}
