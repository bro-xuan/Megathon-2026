// GET /api/factpack?target=Stripe  → normalized, cited FactPack (cache-first).
// Cache-first protects Cala's 100-credit / 10-req-min free tier (golden rule #6).
// Keys are server-only; the browser never talks to Cala directly.

import { getFactPack } from '@/lib/factpack';

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('target')?.trim();
  if (!target) {
    return Response.json({ error: 'Missing ?target=' }, { status: 400 });
  }
  try {
    const pack = await getFactPack(target);
    return Response.json(pack);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build fact pack';
    return Response.json({ error: message }, { status: 502 });
  }
}
