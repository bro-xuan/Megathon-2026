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

/** Cheap keyword classifier → DESIGN.md Study groups. */
function classify(text: string): FactCategory {
  const t = text.toLowerCase();
  if (/(ceo|founder|co-found|chief|president|board|hired|executive|leadership)/.test(t)) return 'people';
  if (/(valuation|invest|funding|round|series [a-z]|raised|owner|stake|acqui|ipo|shareholder|capital)/.test(t)) return 'ownership';
  if (/(2026|recently|latest|last month|announced|launched|new |unveiled)/.test(t)) return 'recent';
  return 'overview';
}

/** Short topic label for a fact (the FactCard heading). */
function labelFor(category: FactCategory, text: string): string {
  const t = text.toLowerCase();
  if (/valuation|valued/.test(t)) return 'Valuation';
  if (/ipo/.test(t)) return 'IPO';
  if (/ceo|chief executive/.test(t)) return 'CEO';
  if (/founder|co-found/.test(t)) return 'Founders';
  if (/acqui/.test(t)) return 'Acquisitions';
  if (/funding|series [a-z]|raised|round/.test(t)) return 'Funding';
  if (/revenue|burn|loss|profit/.test(t)) return 'Financials';
  if (/employee|headcount|staff/.test(t)) return 'Headcount';
  if (/headquarter|based in/.test(t)) return 'Headquarters';
  if (/investor|backed|stake/.test(t)) return 'Investors';
  if (/competitor|rival/.test(t)) return 'Competitors';
  const map: Record<FactCategory, string> = {
    overview: 'Overview',
    people: 'People',
    ownership: 'Ownership',
    recent: 'Recent',
  };
  return map[category];
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
      const category = classify(value);
      return {
        claim: labelFor(category, value),
        value,
        sourceUrl: src.url,
        sourceName: src.name,
        category,
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
