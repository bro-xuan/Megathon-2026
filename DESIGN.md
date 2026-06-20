# Greenroom — Design System

Visual language is **Cal.com-inspired**: clean, neutral, developer-grade SaaS. Sourced from
the Cal `DESIGN.md` in [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/cal/DESIGN.md)
(served at <https://getdesign.md/cal/design-md>) and applied to Greenroom's product. White
canvas, near-black CTAs, generous whitespace, soft-rounded cards, hairline borders over
shadows. Hierarchy comes from **surface treatment, not color intensity** — "confident, not
shouting." This restraint suits a serious finance tool: credible, data-forward, calm.

## 1. Principles

1. **Facts are the hero.** Every fact / fact-check is visibly **sourced** — a citation is a
   first-class element, never decoration.
2. **Calm under pressure.** Quiet interface so the conversation can be loud. Minimal chrome
   during Spar; one clear focal action.
3. **Surface, not shout.** Establish hierarchy with white vs. light-gray surfaces and
   hairline borders rather than heavy color or shadow (Cal philosophy).
4. **Demo-legible.** A judge across the room instantly reads "real cited data" + "voice."

## 2. Fluid responsive sizing (REQUIRED)

Global rule overrides any fixed px. Keep the viewport-scaled root + `rem`; Cal's px tokens
below are given with their `rem` equivalents (÷16).

```css
html { font-size: clamp(16px, 1.15vw, 24px); }
/* body ≥ 1rem · small/labels 0.8rem · headings ≥ 1.5rem */
```
- Containers: `width: min(90%, 75rem)` (~1200px Cal max content width).
- All spacing, padding, radii in `rem`. No fixed px font sizes.

## 3. Color tokens (Cal palette)

Monochrome by default; the only chromatic exceptions are the two **evidence** colors
(verified / flag), kept muted to respect Cal's restraint.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#FFFFFF` | Default page surface |
| `--surface` | `#F5F5F5` | Cards / feature containers |
| `--surface-product` | `#FFFFFF` + hairline border | "Product" surfaces: live transcript, fact cards |
| `--ink` | `#111111` | Primary text **and** primary (black) CTA fill |
| `--muted` | `#6B7280` | Secondary text, labels |
| `--border` | `#E5E5E5` | Hairlines (preferred over shadows) |
| `--footer` | `#101010` | The **only** dark surface — used once, closes the page |
| `--verified` | `#2E7D32` (muted green) | Sourced/correct facts, source chips, passed checks |
| `--flag` | `#C62828` (muted red) | Bluff flags, failed checks |

Flag severity: high `--flag` · medium `#B45309` · low `--muted`.

## 4. Typography (Cal pairing)

Strict separation: **never** body copy in the display face, **never** a headline in Inter.

| Role | Font | Spec |
|---|---|---|
| Display / headings | **Cal Sans**, weight 600, letter-spacing `-0.04em` (geometric, precise) | `clamp(1.8rem, 3vw, 3rem)` |
| UI / body / buttons / nav | **Inter**, weights 400–600 | `1rem` base |
| Facts / sources / transcript | **IBM Plex Mono** (Greenroom addition — signals "data/evidence") | `0.9rem` |

Fallback if Cal Sans unavailable: **Inter 600 with `-0.04em`** tracking, or **Manrope 700**.

## 5. Spacing scale (Cal 4px base → rem)

| Token | px | rem |
|---|---|---|
| `xxs` | 4 | 0.25rem |
| `xs` | 8 | 0.5rem |
| `sm` | 12 | 0.75rem |
| `md` | 16 | 1rem |
| `lg` | 24 | 1.5rem |
| `xl` | 32 | 2rem |
| `xxl` | 48 | 3rem |
| `section` | 96 | 6rem |

- **Section rhythm:** `section` (6rem) vertical band spacing.
- **Card padding:** `xl` (2rem) for feature/primary cards; `lg` (1.5rem) for secondary.
- **Gutters:** `lg` (1.5rem) between cards in grids; `md` (1rem) inside footer columns.

## 6. Radius, borders, shadows

- **Card radius:** ~12px → `0.75rem` (soft-rounded).
- **Borders:** hairline `--border`, 1px. Prefer borders to shadows for separation.
- **Shadows:** minimal/none; only a faint lift on interactive overlays if needed.

## 7. Components (Cal philosophy → Greenroom)

Embed **real UI fragments** inside cards (live transcript, fact cards, score) rather than
illustrations — Cal's "show the product in the card" approach.

- `Button` — primary: `--ink` fill, white text; secondary: white + `--border` hairline.
- `nav-pill-group` — Cal's signature pill-radius wrapper; use for scenario/mode switching.
- `BookingPicker` — Cal-style calendar + time-slot grid for "scheduling" the interview.
- `ConfirmationCard` — "booked for [time]" confirmation with a "Join now" action.
- `SourceChip` — value + outbound citation; `--verified` text/border. Used wherever a fact appears.
- `FactCard` — grouped facts on `--surface`; source chips inline.
- `InterviewerStage` — static-image "video" frame: avatar photo + name/title caption +
  speaking-state indicator (the fake video-call surface; audio-only underneath).
- `CallBar` — bottom call-control bar: `MicButton`, mute, end.
- `MicButton` — push-to-talk with speaking state (neutral, no loud accent).
- `TranscriptLine` — role-tagged line on `--surface-product`; optional `FlagChip`.
- `FlagChip` — severity-colored; expands to `issue · correctValue · source`.
- `ScorePanel` — overall + sub-scores; numbers in the mono face.
- `GraphView` — react-force-graph wrapper, neutral palette (cut-able).

## 8. Screens & flows

```
Landing ──► Schedule ──► Study ──► Spar ──► Debrief
            (book slot)  (facts)  (video)  (sourced flags + score)
```

### 8.1 Landing
- Cal Sans hero with the product one-liner; generous whitespace on white canvas. A single
  scenario card (**"IB / Finance Interview"**) on `--surface`; curated target picker as
  prominent cards. CTA (black `--ink` button): **"Book your interview →"**.

### 8.2 Schedule — the booking (fake)
- A **Cal.com-style booking screen** (fitting — our design language *is* Cal's): a
  `BookingPicker` (calendar date + time-slot grid) to "schedule" the mock interview with the
  chosen interviewer. On confirm, a `ConfirmationCard` ("Your interview with [name] is booked
  for [time]") with a **"Join now →"** action. **Faked:** no real time-triggered backend —
  "Join now" launches the call immediately; "scheduling" is product theater for realism.

### 8.3 Study
- **Fact-pack cards** grouped (Overview · People · Ownership/Funding · Recent activity) on
  `--surface`, each fact value in mono with a `SourceChip`. **Knowledge graph** (cut-able)
  on a white `--surface-product` panel with hairline border. CTA: **"Go to interview →"**.

### 8.4 Spar — the "video call"
- Styled as a **video call**, though the medium is **audio-only**: the "video" is a
  **static interviewer image** + call chrome (no camera, no real video stream, no phone/
  Twilio). Layout: a large interviewer "video" frame (avatar photo, name/title caption,
  quiet speaking indicator) on white canvas; an optional small self-tile. Bottom **call bar**
  holds `MicButton` (push-to-talk), mute, and a single red **"End interview"** control. Live
  transcript on a collapsible `--surface-product` side rail (muted, non-distracting). A small
  "grounded in N cited facts" note keeps the moat visible.

### 8.5 Debrief
- **ScorePanel** at top (overall + Accuracy / Composure). Transcript on `--surface-product`
  with inline `FlagChip`s on bluffed lines → `issue · correctValue · source`. Correct claims
  get a quiet `--verified` tick. Summary line: "X bluffs caught, all sourced" — the punchline.
- Optional `--footer` (`#101010`) band closes the page (the one dark surface).

## 9. Motion (restrained, Cal-like)

- Cross-screen: 150–200ms fade/slide. No gratuitous motion during Spar.
- Speaking indicator: gentle pulse (neutral, not colored).
- Debrief flags reveal with a short stagger so caught bluffs land one by one (demo beat).

## 10. Accessibility / venue realities

- High contrast on white (`--ink` on `--canvas`).
- Push-to-talk (not always-listening) for a loud venue.
- Source links keyboard-focusable; flags carry text labels, not color alone.
