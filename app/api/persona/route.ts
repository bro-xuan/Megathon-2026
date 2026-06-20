// GET /api/persona            → list of distilled personas (cards for the index)
// GET /api/persona?slug=<slug> → a single distilled persona profile
//
// Cache-only: reads data/personas/*.json. Distillation (Cala + LLM) happens offline via
// `npm run distill` — never on the request path (mirrors the fact-pack rule: ground before the
// call, never live).

import { getPersona, listPersonas } from '@/lib/persona';

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim();
  if (slug) {
    const profile = await getPersona(slug);
    if (!profile) return Response.json({ error: 'Unknown persona' }, { status: 404 });
    return Response.json({ profile });
  }
  return Response.json({ personas: await listPersonas() });
}
