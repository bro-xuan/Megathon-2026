# Pre-rendered persona voice clips

Drop an audio file named `<persona-slug>.{mp3,wav,m4a,ogg}` here and the dossier's
"Hear them" button (`/api/voice-preview?slug=<slug>`) will play it instead of the
ElevenLabs soundalike or browser TTS. Instant, offline, demo-proof.

## Generate the Elon Musk clip (free, ~2 min)

The anonymous FakeYou API leaves jobs queued forever, so generate it from the website
with a free account:

1. Sign up / log in at https://fakeyou.com (free).
2. Open the **"Elon Musk (New Version 2.0)"** model:
   https://fakeyou.com/tts/weight_6xt6wfgtk4c79hg0wkrv63kf6
   (296k+ uses — the best Elon model. Alternates: "Elon Musk (Version 3.0)".)
3. Paste the opening line (matches the dossier):

   > Alright, let's get into it. Walk me through your valuation, but don't just give me
   > the multiples and the comparable companies. Start from first principles. Why does
   > this business have any value at all?

4. Generate, then **download the WAV**.
5. Save it here as `elon-musk.wav` (this folder).
6. Refresh `/persona/elon-musk` and hit **Hear them** — it'll play the real Elon voice.

This clip is an AI approximation for an interview-practice demo, not the real person.
