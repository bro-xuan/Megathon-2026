// GET /api/call/[id] → proxy Vapi GET /call/{id} and normalize its (messy) transcript
// into TranscriptTurn[]. SERVER-ONLY: uses VAPI_PRIVATE_KEY.
//
// NOTE: the exact Vapi transcript shape is confirmed in M0b (when the key lands). The
// normalizer below handles the documented shapes defensively; finalize against the real
// payload once `scripts/test-vapi.ts` prints it.

import type { TranscriptTurn } from '@/lib/types';

type VapiMessage = { role?: string; message?: string; text?: string; content?: string };

function normalize(call: Record<string, unknown>): TranscriptTurn[] {
  const artifact = call.artifact as { messages?: VapiMessage[] } | undefined;
  const messages: VapiMessage[] =
    (call.messages as VapiMessage[] | undefined) ?? artifact?.messages ?? [];
  return messages
    .map((m): TranscriptTurn | null => {
      const text = (m.message ?? m.text ?? m.content ?? '').trim();
      if (!text) return null;
      const role = (m.role ?? '').toLowerCase();
      if (role === 'system') return null;
      // Vapi: "user" = the human candidate; "bot"/"assistant" = the interviewer.
      return { role: role === 'user' ? 'candidate' : 'interviewer', text };
    })
    .filter((t): t is TranscriptTurn => t !== null);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = process.env.VAPI_PRIVATE_KEY;
  if (!key) {
    return Response.json({ error: 'VAPI_PRIVATE_KEY not set (M0b pending)' }, { status: 501 });
  }
  try {
    const res = await fetch(`https://api.vapi.ai/call/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return Response.json({ error: `Vapi ${res.status}` }, { status: 502 });
    }
    const call = await res.json();
    return Response.json({ id, transcript: normalize(call), raw: call });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vapi proxy failed';
    return Response.json({ error: message }, { status: 502 });
  }
}
