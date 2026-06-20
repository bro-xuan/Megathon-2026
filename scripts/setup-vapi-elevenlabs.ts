// One-time setup: register your ElevenLabs key as a Vapi provider credential, so live calls can
// use ElevenLabs voices (the per-persona soundalikes — e.g. the Elon Musk demo). Vapi uses
// "bring-your-own" credentials stored in your Vapi ACCOUNT, separate from this app's .env; the
// ELEVENLABS_API_KEY in .env is only used by the offline distill scripts. Run once:
//
//   npm run setup:11labs
//
// Idempotent-ish: re-running creates another credential entry (harmless; Vapi uses the 11labs one).
// Reads both keys from .env via --env-file and never prints them.

const vapiKey = process.env.VAPI_PRIVATE_KEY;
const elevenKey = process.env.ELEVENLABS_API_KEY;

if (!vapiKey) {
  console.error('VAPI_PRIVATE_KEY not set in .env');
  process.exit(1);
}
if (!elevenKey) {
  console.error('ELEVENLABS_API_KEY not set in .env');
  process.exit(1);
}

(async () => {
  // Don't double-register if an 11labs credential already exists.
  const list = await fetch('https://api.vapi.ai/credential', {
    headers: { Authorization: `Bearer ${vapiKey}` },
  });
  if (list.ok) {
    const data = await list.json();
    const items = Array.isArray(data) ? data : (data.results ?? []);
    if (items.some((c: { provider?: string }) => c.provider === '11labs')) {
      console.log('✓ An ElevenLabs (11labs) credential is already registered in Vapi. Nothing to do.');
      return;
    }
  }

  const res = await fetch('https://api.vapi.ai/credential', {
    method: 'POST',
    headers: { Authorization: `Bearer ${vapiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: '11labs', apiKey: elevenKey, name: 'ElevenLabs (greenroom)' }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ Vapi credential create failed (${res.status}): ${text.slice(0, 400)}`);
    process.exit(1);
  }
  let id = '';
  try {
    id = (JSON.parse(text) as { id?: string }).id ?? '';
  } catch {
    /* ignore */
  }
  console.log(`✓ Registered ElevenLabs credential in Vapi${id ? ` (id ${id})` : ''}.`);
  console.log('  The Elon Musk persona will now speak with its ElevenLabs soundalike on live calls.');
})().catch((e) => {
  console.error('Setup failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
