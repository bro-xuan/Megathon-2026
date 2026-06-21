// Voiceover pipeline — the SINGLE SOURCE OF TRUTH for narration.
// For each scene: synthesize VO (ElevenLabs, falling back to macOS `say`), probe its duration
// with ffprobe, then emit src/timings.json so the Remotion composition sizes every scene to its
// own audio. Re-run any time you tweak a line: `npm run voiceover` (from video/).
//
//   Quality default : ElevenLabs `eleven_multilingual_v2`, voice "George" (warm narrator).
//   Swap the voice  : VO_VOICE_ID=<id> npm run voiceover   (list ids: the /v1/voices endpoint)
//   Offline fallback: USE_SAY=1 npm run voiceover          (macOS `say`, no API key needed)
//
// The key is read from the repo's ../.env.local (ELEVENLABS_API_KEY). The npm script sources it.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const FPS = 30;

// ── Narration script ────────────────────────────────────────────────────────────────────────
// `vo` is the spoken line. `head`/`tail` are silent pad (seconds) before/after the audio inside
// the scene so it breathes. Scene duration = head + audioDuration + tail (+ minSec floor).
const SCENES = [
  {
    id: "problem",
    head: 0.5,
    tail: 1.3,
    vo: "Some conversations, you only get one shot at. The raise you've rehearsed a hundred times — in your head. The interview that sets up the next four years. The talk you keep putting off. And we walk in cold... because there's nowhere to practice the hardest thing we ever do. Talking to another person.",
  },
  {
    id: "intro",
    head: 0.4,
    tail: 1.0,
    vo: "Greenroom is a voice-native room to practice any hard conversation — out loud, against someone who actually challenges you. First, you pick the conversation. Then it becomes the person across the table — their stance, their resistance, their toughest questions. And when the conversation turns on facts, Greenroom is grounded in real, cited sources, powered by Cala — so it holds you to what's actually true.",
  },
  {
    id: "demo",
    head: 0.4,
    tail: 1.8,
    // Mode A bridge VO. If you drop in your own screen recording (Mode B), set vo:"" here and
    // re-run — the scene will size to the recording instead (see src/scenes/SceneDemo.tsx).
    vo: "So step into a live call. You make your case, out loud, in real time. And the moment a number doesn't hold up... it catches you. On the record.",
  },
  {
    id: "debrief",
    head: 0.4,
    tail: 1.3,
    vo: "When the call ends, Greenroom scores how you carried it. Five capabilities — grounding, composure, structure, and more. What you nailed. Where you bluffed. And exactly what to fix before it's real.",
  },
  {
    id: "close",
    head: 0.4,
    tail: 1.8,
    vo: "Greenroom. Practice the conversation... before it counts. Walk in ready.",
  },
];

// ── TTS providers ─────────────────────────────────────────────────────────────────────────────
const EL_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VO_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // George — warm, captivating narrator
const MODEL = process.env.VO_MODEL || "eleven_multilingual_v2";
const USE_SAY = process.env.USE_SAY === "1" || !EL_KEY;

async function synthElevenLabs(text, outMp3) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.16, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outMp3, buf);
}

function synthSay(text, outMp3) {
  const aiff = outMp3.replace(/\.mp3$/, ".aiff");
  execFileSync("say", ["-v", process.env.SAY_VOICE || "Samantha", "-r", "172", "-o", aiff, text]);
  execFileSync("ffmpeg", ["-y", "-i", aiff, "-codec:a", "libmp3lame", "-qscale:a", "2", outMp3], { stdio: "ignore" });
  execFileSync("rm", ["-f", aiff]);
}

function probeDuration(mp3) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", mp3,
  ]).toString().trim();
  return parseFloat(out);
}

// ── Run ─────────────────────────────────────────────────────────────────────────────────────
mkdirSync(AUDIO_DIR, { recursive: true });
console.log(`Voiceover provider: ${USE_SAY ? "macOS say" : `ElevenLabs (${MODEL}, voice ${VOICE_ID})`}`);

const out = [];
for (const s of SCENES) {
  const file = `audio/${s.id}.mp3`;
  const abs = join(ROOT, "public", file);
  let audioSec = 0;

  if (s.vo && s.vo.trim()) {
    process.stdout.write(`  • ${s.id} … `);
    if (USE_SAY) synthSay(s.vo, abs);
    else await synthElevenLabs(s.vo, abs);
    audioSec = probeDuration(abs);
    console.log(`${audioSec.toFixed(2)}s`);
  } else {
    console.log(`  • ${s.id} … (no VO — placeholder duration)`);
  }

  const sceneSec = s.head + audioSec + s.tail || Math.max(s.minSec || 6, 6);
  const durationInFrames = Math.max(Math.round(sceneSec * FPS), Math.round((s.minSec || 0) * FPS));
  out.push({
    id: s.id,
    audio: audioSec > 0 ? file : null,
    audioSec,
    audioStartFrame: Math.round(s.head * FPS),
    durationInFrames,
  });
}

const totalFrames = out.reduce((a, s) => a + s.durationInFrames, 0);
const timings = { fps: FPS, width: 1920, height: 1080, totalFrames, scenes: out };
writeFileSync(join(ROOT, "src", "timings.json"), JSON.stringify(timings, null, 2) + "\n");

console.log(`\n✓ timings.json written — ${out.length} scenes, ${(totalFrames / FPS).toFixed(1)}s total (${totalFrames}f @ ${FPS}fps)`);
