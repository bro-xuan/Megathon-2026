# Greenroom — Design System & UX

Companion to `PRD.md`. The name **Greenroom** = the backstage room where performers
prepare before going on stage. The product takes you from the greenroom (Study) → on stage
(Spar) → the review notes (Debrief). The visual language leans theatrical and composed:
calm dark "backstage", a warm spotlight accent, and clear evidentiary surfaces for facts.

## 1. Design principles

1. **Facts are the hero.** Every fact and fact-check is visibly **sourced** — a citation is
   a first-class UI element, never an afterthought.
2. **Calm under pressure.** The interface is quiet so the conversation can be loud. Minimal
   chrome during Spar; one clear focal action.
3. **Evidence over decoration.** A flagged bluff with a working source link is worth more
   than any animation. Polish serves credibility.
4. **Demo-legible.** A judge across the room can read the screen and instantly see "real
   data" + "voice".

## 2. Fluid responsive sizing (REQUIRED — Retina/wide-display safe)

Per global rules, never use fixed `px` font sizes. Establish a viewport-scaled root and use
`rem` everywhere.

```css
html { font-size: clamp(16px, 1.15vw, 24px); }
/* body text ≥ 1rem · small/labels 0.8rem · headings ≥ 1.5rem */
```

- Containers: `width: min(90%, 64rem)` (not fixed px max-widths).
- Spacing, padding, radii: `rem` units.
- Tailwind: configure the base on `html`; prefer `rem`-based scale; avoid `text-xs` hardcodes
  for primary content.

## 3. Color tokens

Dark, theatrical base with a warm spotlight accent and a clear "verified" green.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0E1116` | App background (backstage) |
| `--surface` | `#171B22` | Cards, panels |
| `--surface-2` | `#1F242D` | Raised / hover |
| `--text` | `#E8EAED` | Primary text |
| `--text-muted` | `#9AA3AF` | Secondary text, labels |
| `--accent` | `#E8B04B` | Spotlight — primary actions, "on stage" |
| `--verified` | `#3FB950` | Verified facts, passed checks, source chips |
| `--flag` | `#E5534B` | Bluff flags, failed checks |
| `--border` | `#2A303A` | Hairlines |

Severity for flags: high `--flag`, medium `#E3A008`, low `--text-muted`.

## 4. Typography

| Role | Font | Size |
|---|---|---|
| Display / headings | **Fraunces** or **Playfair Display** (a theatrical serif) | `clamp(1.8rem, 3vw, 3rem)` |
| UI / body | **Inter** | `1rem` base |
| Facts / sources / transcript | **IBM Plex Mono** | `0.9rem` |

Mono for facts and transcripts signals "data/evidence" and aids scan-ability.

## 5. Screens & flows

```
Landing ──► Study ──► Spar ──► Debrief
            (facts)   (voice)  (sourced flags + score)
```

### 5.1 Landing
- Hero line (the PRODUCT.md one-liner) + a single scenario card: **"IB / Finance
  Interview"**. Curated target picker (1–2 demo companies as prominent cards; arbitrary
  input hidden/secondary for the demo).
- CTA: **"Enter the greenroom →"** → Study.

### 5.2 Study (the greenroom)
- **Fact pack cards:** grouped (Overview · People · Ownership/Funding · Recent activity).
  Each fact shows value + a small **source chip** (`--verified`) linking out. Mono font.
- **Knowledge graph** (cut-able): force-directed entity/relationship view; click an edge →
  source. If cut, this section is simply absent and cards carry the weight.
- CTA: **"Go on stage →"** → Spar.

### 5.3 Spar (on stage)
- Minimal, focused. Center: a **mic / talk affordance** (push-to-talk) with a live
  speaking indicator. Spotlight (`--accent`) framing.
- Live transcript streams in a side rail (muted styling so it doesn't distract).
- Single **"End interview"** action → Debrief. No other chrome.
- Subtle "grounded in N cited facts" badge to keep the moat visible.

### 5.4 Debrief (the notes)
- **Score** at top (overall + a couple of sub-scores e.g. Accuracy / Composure).
- **Transcript** with inline **flag chips** on bluffed lines: hover/expand →
  `issue · correctValue · source link`. Verified-correct claims optionally get a quiet
  `--verified` tick.
- "X bluffs caught, all sourced" summary line — the punchline of the demo.

## 6. Components

- `SourceChip` — value + outbound citation (verified green). Used everywhere a fact appears.
- `FactCard` — grouped facts with source chips.
- `MicButton` — push-to-talk with speaking state.
- `TranscriptLine` — role-tagged line; optional `FlagChip`.
- `FlagChip` — severity-colored; expands to issue/correct/source.
- `ScorePanel` — overall + sub-scores.
- `GraphView` — react-force-graph wrapper (cut-able).

## 7. Motion (restrained)

- Cross-screen: 150–200ms fade/slide. Spotlight "lights up" on entering Spar.
- Live speaking indicator: gentle pulse on `--accent`.
- Flag reveal in Debrief: short stagger so caught bluffs land one by one (demo beat).
- No gratuitous motion during Spar — the voice is the show.

## 8. Accessibility / venue realities

- High contrast on the dark base (text ≥ `#E8EAED`).
- Push-to-talk (not always-listening) for a loud venue.
- Source links keyboard-focusable; flags have text labels, not color alone.
