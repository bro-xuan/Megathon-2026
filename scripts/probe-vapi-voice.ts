// Read-only probe: what voice are the live dashboard assistants actually using, and which voice
// provider credentials are registered in this Vapi account? Answers "what am I hearing?" and
// "what can I switch to without breaking the call?" before we touch any config.
//
// Usage: npx tsx --env-file=.env scripts/probe-vapi-voice.ts

const API = 'https://api.vapi.ai';
const KEY = process.env.VAPI_PRIVATE_KEY;
if (!KEY) throw new Error('VAPI_PRIVATE_KEY not set (run via tsx --env-file=.env)');

async function vapi(pathname: string): Promise<any> {
  const res = await fetch(`${API}${pathname}`, {
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vapi GET ${pathname} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('=== ENV FLAGS ===');
  console.log('VAPI_USE_ELEVENLABS =', JSON.stringify(process.env.VAPI_USE_ELEVENLABS));
  console.log('ELEVENLABS_VOICE_ID =', JSON.stringify(process.env.ELEVENLABS_VOICE_ID));
  console.log();

  console.log('=== REGISTERED CREDENTIALS (which providers can we use?) ===');
  try {
    const creds: any[] = await vapi('/credential?limit=100');
    if (!creds.length) console.log('(none registered — only Vapi-managed defaults available)');
    for (const c of creds) {
      console.log(`- ${c.provider?.padEnd(14) ?? '?'}  id=${c.id}  name=${c.name ?? ''}`);
    }
  } catch (e) {
    console.log('credential list failed:', e instanceof Error ? e.message : e);
  }
  console.log();

  console.log('=== CURRENT ASSISTANTS — voice + endpointing actually in use ===');
  const assistants: any[] = await vapi('/assistant?limit=100');
  for (const a of assistants) {
    if (!String(a.name ?? '').startsWith('Greenroom')) continue;
    const v = a.voice ?? {};
    console.log(`\n• ${a.name}  (${a.id})`);
    console.log(`    voice:        provider=${v.provider ?? '(none → Vapi default)'}  voiceId=${v.voiceId ?? v.voice ?? '-'}  model=${v.model ?? '-'}`);
    console.log(`    model(LLM):   provider=${a.model?.provider ?? '-'}  model=${a.model?.model ?? '-'}`);
    console.log(`    transcriber:  provider=${a.transcriber?.provider ?? '-'}  model=${a.transcriber?.model ?? '-'}`);
    console.log(`    startSpeaking: ${JSON.stringify(a.startSpeakingPlan ?? null)}`);
    console.log(`    stopSpeaking:  ${JSON.stringify(a.stopSpeakingPlan ?? null)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
