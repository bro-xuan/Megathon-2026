# Greenroom — hackathon pitch video (Remotion)

A self-contained 1080p pitch video, **isolated from the Next app** (own `package.json` /
`node_modules`, so it can't break the product). ~80s, five scenes, ElevenLabs voiceover synced to
each scene.

```
cd video
npm install            # once
npm run voiceover      # synth VO + write src/timings.json  (needs ../.env.local ELEVENLABS_API_KEY)
npm run studio         # live preview / scrub at http://localhost:3000
npm run render         # → out/greenroom.mp4
```

## Storyline → file map

| Scene | File | Beat |
|---|---|---|
| 1 Problem | `src/scenes/SceneProblem.tsx` | Conversations you get one shot at → "no gym for… Talk." |
| 2 Intro | `src/scenes/SceneIntro.tsx` | Lights on, 3-step model, **Cala** grounding card |
| 3 Live demo | `src/scenes/SceneDemo.tsx` | Spar room + bluff caught on the record (the hero beat) |
| 4 Debrief | `src/scenes/SceneDebrief.tsx` | Capability scorecard — grade, radar, 5 bars |
| 5 Close | `src/scenes/SceneClose.tsx` | "Walk in ready." + Cala/Vapi credits |

## Edit the narration
All VO lines live in **`scripts/voiceover.mjs`** (`SCENES[].vo`). Edit, then `npm run voiceover` —
it re-synths and rewrites `src/timings.json`, so each scene automatically resizes to its new audio
length. No frame math by hand.

- **Change the narrator voice:** `VO_VOICE_ID=<id> npm run voiceover` (default = "George"). List
  ids via the ElevenLabs `/v1/voices` endpoint.
- **Offline, no API key:** `USE_SAY=1 npm run voiceover` (macOS `say`).

## Swap in your own screen recording (Scene 3)
1. Record yourself driving `/spar` → save as `video/public/demo-recording.mp4`.
2. In `src/scenes/SceneDemo.tsx` set `USE_REAL_RECORDING = true`.
3. In `scripts/voiceover.mjs` set the `demo` scene `vo: ""`, then `npm run voiceover` (the scene
   then sizes to silence/your clip and the bridge VO steps aside).
4. `npm run render`.

The recreated demo (default) is a faithful stand-in so the video is complete *before* you record.

## Notes
- Tokens, fonts (Inter/Manrope/IBM Plex Mono), the brand mark, scorecard math, and the bluff-catch
  card are ported from the real product (`app/globals.css`, `lib/scorecard.ts`,
  `app/components/`), so the visuals match what a judge sees in the app.
- Debrief numbers are illustrative of a mid-progress run (overall "Developing"), with grounding +
  composure as the visible weak spots — continuous with the Scene 3 catch.
