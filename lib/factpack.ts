// Normalize Cala knowledge_search → FactPack, with a JSON cache. SERVER-ONLY.
// knowledge_search is the primary source (see lib/cala.ts notes): its `content` is the
// grounded summary we inject into the interviewer prompt; `explainability[]` gives the
// claim→source map that becomes our cited facts; `entities[]` is the relationship network.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  knowledgeSearch,
  type CalaSource,
  type KnowledgeSearchResult,
} from './cala';
import type { Fact, FactCategory, FactPack, Relationship } from './types';

const CACHE_DIR = path.join(process.cwd(), 'data', 'factpacks');

export function slugify(target: string): string {
  return target.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Cala rejects over-long compound queries for some entities with a degenerate
// "too complex…" summary (0 facts). Try a moderately rich query first, then fall
// back to progressively simpler ones so a curated company never caches empty.
function searchInputs(target: string): string[] {
  return [
    `${target} company overview, valuation, investors, and recent news`,
    `${target} valuation, IPO plans, and major investors in 2026`,
    `${target} overview and valuation`,
    target,
  ];
}

/** A degenerate Cala response carries no citable facts (e.g. the "too complex" punt). */
function isDegenerate(pack: FactPack): boolean {
  return pack.facts.length === 0 || /too complex/i.test(pack.summary);
}

/** Prefer a deep article link (has a real path) over a bare homepage. */
function bestSource(origins: { source: CalaSource }[] = []): CalaSource | undefined {
  const sources = origins.map((o) => o.source).filter((s): s is CalaSource => !!s?.url);
  if (!sources.length) return undefined;
  const deep = sources.find((s) => {
    try {
      return new URL(s.url).pathname.replace(/\/$/, '').length > 1;
    } catch {
      return false;
    }
  });
  return deep ?? sources[0];
}

/** Fallback keyword classifier → DESIGN.md Study groups (used only when no lead label matches). */
function classify(text: string): FactCategory {
  const t = text.toLowerCase();
  if (/(ceo|found(ed|er|ing)|co-found|chief|president|board|hired|executive|leadership)/.test(t)) return 'people';
  if (/(valuation|valued|invest|funding|round|series [a-z]|raised|owner|stake|acqui|ipo|shareholder|capital)/.test(t)) return 'ownership';
  if (/(2026|recently|latest|last month|announced|launched|unveiled|\bnew\b)/.test(t)) return 'recent';
  return 'overview';
}

// Topic labels for the FactCard heading. We pick the topic the sentence LEADS with
// (earliest keyword by position), not a fixed priority — so "Key investors include…"
// reads as Investors, not Founders, and a founding sentence reads as Founders, not CEO.
const LABEL_RULES: [RegExp, string][] = [
  [/valuation|valued|\bworth\b/, 'Valuation'],
  [/\bipo\b|public offering|go(ing)? public|sec paperwork/, 'IPO'],
  [/found(ed|er|ing)|co-found/, 'Founders'],
  [/chief executive|\bceo\b/, 'CEO'],
  [/acqui/, 'Acquisitions'],
  [/investor|backed by|\bstake\b|shareholder/, 'Investors'],
  [/funding|series [a-z]|raised|\bround\b/, 'Funding'],
  [/revenue|burn|\bloss(es)?\b|profit|\bcash\b/, 'Financials'],
  [/employee|headcount|staff|engineers/, 'Headcount'],
  [/headquarter|based in/, 'Headquarters'],
  [/competitor|rival/, 'Competitors'],
  [/launched|unveiled|announced|deployed/, 'Recent'],
];

// Keep each heading and its Study section consistent: derive the group from the label.
const LABEL_CATEGORY: Record<string, FactCategory> = {
  Valuation: 'ownership', IPO: 'ownership', Investors: 'ownership', Funding: 'ownership',
  Acquisitions: 'ownership', Financials: 'ownership',
  Founders: 'people', CEO: 'people', Headcount: 'people',
  Headquarters: 'overview', Competitors: 'overview',
  Recent: 'recent',
};

const CATEGORY_LABEL: Record<FactCategory, string> = {
  overview: 'Overview',
  people: 'People',
  ownership: 'Ownership',
  recent: 'Recent',
};

/** Lead-topic heading for a fact (earliest matching keyword), or null if nothing matches. */
function leadLabel(text: string): string | null {
  const t = text.toLowerCase();
  let best: string | null = null;
  let bestIdx = Infinity;
  for (const [re, label] of LABEL_RULES) {
    const m = t.match(re);
    if (m && m.index !== undefined && m.index < bestIdx) {
      bestIdx = m.index;
      best = label;
    }
  }
  return best;
}

/** Heading + Study group for a fact, kept consistent with each other. */
function topicFor(text: string): { claim: string; category: FactCategory } {
  const lead = leadLabel(text);
  if (lead) return { claim: lead, category: LABEL_CATEGORY[lead] ?? 'overview' };
  const category = classify(text);
  return { claim: CATEGORY_LABEL[category], category };
}

/** Re-derive each fact's category + heading from its text — no Cala call. Apply to a cached
 *  pack after a labeling-rule change so we don't re-query (and risk content drift / credits). */
export function relabel(pack: FactPack): FactPack {
  return {
    ...pack,
    facts: pack.facts.map((f) => ({ ...f, ...topicFor(f.value) })),
  };
}

export function normalize(target: string, raw: KnowledgeSearchResult, fetchedAt: string): FactPack {
  const byId = new Map(raw.context?.map((c) => [c.id, c]) ?? []);

  const facts: Fact[] = (raw.explainability ?? [])
    .map((ex): Fact | null => {
      const origins = (ex.references ?? [])
        .map((id) => byId.get(id))
        .filter(Boolean)
        .flatMap((c) => c!.origins ?? []);
      const src = bestSource(origins);
      if (!src) return null; // only keep facts we can cite
      const value = ex.content.trim();
      return {
        ...topicFor(value),
        value,
        sourceUrl: src.url,
        sourceName: src.name,
      };
    })
    .filter((f): f is Fact => f !== null);

  // Relationship network from the related-entity list (retrieve_entity relationships are empty).
  const relationships: Relationship[] = (raw.entities ?? [])
    .filter((e) => e.name.toLowerCase() !== target.toLowerCase())
    .map((e) => ({ type: e.entity_type, from: target, to: e.name }));

  // The grounded entity id, if Cala surfaced the company itself in entities[].
  const self = raw.entities?.find((e) => e.name.toLowerCase() === target.toLowerCase());

  return {
    target,
    entityId: self?.id ?? '',
    summary: raw.content?.trim() ?? '',
    facts,
    relationships,
    fetchedAt,
  };
}

/** Build a fresh pack from Cala (no cache), retrying simpler queries on a degenerate result. */
export async function buildFactPack(target: string): Promise<FactPack> {
  let last: FactPack | null = null;
  for (const input of searchInputs(target)) {
    const raw = await knowledgeSearch(input);
    const pack = normalize(target, raw, new Date().toISOString());
    if (!isDegenerate(pack)) return pack;
    last = pack; // keep the most recent attempt as a fallback
  }
  return last ?? normalize(target, { content: '', context: [], explainability: [], entities: [] }, new Date().toISOString());
}

/** Cache-first: read data/factpacks/<slug>.json, else build + persist. */
export async function getFactPack(target: string, opts: { refresh?: boolean } = {}): Promise<FactPack> {
  const file = path.join(CACHE_DIR, `${slugify(target)}.json`);
  if (!opts.refresh && existsSync(file)) {
    return JSON.parse(await readFile(file, 'utf8')) as FactPack;
  }
  const pack = await buildFactPack(target);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(pack, null, 2));
  return pack;
}

/** Read a cached pack without ever calling Cala (for the API's cache-only mode). */
export async function readCachedPack(target: string): Promise<FactPack | null> {
  const file = path.join(CACHE_DIR, `${slugify(target)}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8')) as FactPack;
}

/** Load every prep pack in the curated library (the companies the grounded tracks ground on). */
export async function getPrepPacks(targets: readonly string[]): Promise<FactPack[]> {
  return Promise.all(targets.map((t) => getFactPack(t)));
}

/** Combine multiple prep packs into one for the debrief reasoner (union of cited facts). */
export function mergePacks(packs: FactPack[]): FactPack {
  return {
    target: packs.map((p) => p.target).join(' / '),
    entityId: '',
    summary: packs.map((p) => `${p.target}: ${p.summary}`).join('\n\n'),
    facts: packs.flatMap((p) => p.facts),
    relationships: packs.flatMap((p) => p.relationships),
    fetchedAt: packs[0]?.fetchedAt ?? '',
  };
}
