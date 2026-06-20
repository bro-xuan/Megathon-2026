// Cala.ai REST client — SERVER-ONLY. Never import into a Client Component.
// Base https://api.cala.ai, header X-API-KEY. Free tier: 100 credits/mo, 10 req/min.
//
// VERIFIED 2026-06-20 (see scripts/test-cala.ts, data/cala-raw/*.json):
//   knowledge_search  POST /v1/knowledge/search   body { input: string }
//                       -> { content, explainability[], context[], entities[] }
//                       This is the PRIMARY source: grounded prose + cited evidence
//                       (context[].origins[].source.{name,url}) + a claim->source map
//                       (explainability[].references -> context[].id) + related entities.
//   entity_search     GET  /v1/entities?name=...   -> { entities: [{id,name,entity_type,mentions}] }
//                       NOTE: returns multiple/duplicate matches; some are sparse.
//   retrieve_entity   POST /v1/entities/{uuid}     body {}  -> profile
//                       CAVEAT: relationships.{outgoing,incoming} come back EMPTY for the
//                       companies we tested, regardless of body params. Do NOT rely on it for
//                       the network — use knowledge_search's context/entities instead.

const BASE = process.env.CALA_API_BASE || 'https://api.cala.ai';

function apiKey(): string {
  const key = process.env.CALA_API_KEY;
  if (!key) throw new Error('CALA_API_KEY is not set');
  return key;
}

export class CalaError extends Error {
  constructor(
    public status: number,
    public path: string,
    public body: string,
  ) {
    super(`Cala ${status} on ${path}: ${body.slice(0, 500)}`);
    this.name = 'CalaError';
  }
}

async function cala<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-API-KEY': apiKey(), 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new CalaError(res.status, path, text);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ---- Verified response shapes (partial; see data/cala-raw/*.json) ----

export type CalaSource = { name: string; url: string };

export type CalaContextChunk = {
  id: string;
  content: string;
  origins: Array<{ source: CalaSource; document?: CalaSource; breadcrumb?: string[] }>;
};

export type CalaExplain = {
  content: string; // a single claim, in prose
  references: string[]; // -> CalaContextChunk.id
};

export type CalaEntityRef = {
  id: string;
  name: string;
  entity_type: string;
  mentions?: string[];
};

export type KnowledgeSearchResult = {
  content: string; // grounded markdown summary
  explainability: CalaExplain[];
  context: CalaContextChunk[];
  entities: CalaEntityRef[];
};

/** PRIMARY call: cited prose + evidence + entity network for a company. */
export function knowledgeSearch(input: string): Promise<KnowledgeSearchResult> {
  return cala<KnowledgeSearchResult>('/v1/knowledge/search', {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

/** Resolve a name to candidate entities (first match is not always the richest). */
export function entitySearch(name: string): Promise<{ entities: CalaEntityRef[] }> {
  return cala(`/v1/entities?name=${encodeURIComponent(name)}`, { method: 'GET' });
}

/** Full entity profile by UUID. Relationships are unreliable — prefer knowledgeSearch. */
export function retrieveEntity(id: string): Promise<Record<string, unknown>> {
  return cala(`/v1/entities/${id}`, { method: 'POST', body: '{}' });
}
