# DESIGN.md · Kaidenpa (怪電波)

The visual source of truth for the build. `docs/PLAN.md` has the full architecture and channel list; the PNGs in `docs/mocks/` are the look. This file holds the tokens and rules the code must use. If code and this file disagree, fix one of them in the same PR.

## Colour tokens

Defined in `src/style.css` (`:root`). Use the variables, not raw hex, in new CSS.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0c0914` | Page background |
| `--screen` | `#05030a` | Inside the CRT |
| `--ink` | `#f1ecf7` | Main text on dark |
| `--muted` | `#b7aecb` | Secondary text on dark |
| `--green` | `#6fe38a` | Labels, focus ring |
| `--coral` | `#ff7a66` | Warnings in the UI chrome |
| `--magenta` | `#e22bb8` | Accent, chromatic offset, bars |
| `--paper` / `--paper-ink` | `#ede5d8` / `#1a1220` | Paper cards (definition, transcripts) |

Channel palettes live in each channel's CSS as local custom properties (CH 03: `--ch03-navy`, `--ch03-blue`, `--ch03-pink`, `--ch03-bar`). Keep them scoped to `.chNN`.

Contrast: 4.5:1 for body text, 3:1 for text 24 px and up (WCAG 1.4.3). Check every pair with the contrast script or `a11y-enforcer:contrast` before merging. Decorative Baybayin and noise are exempt, but never put meaning only in them.

## Type

| Role | Family | Notes |
| --- | --- | --- |
| Display (wordmark, channel titles) | Dela Gothic One | Subset covers 怪電波 only. Any new CJK glyph needs `npm run fonts` |
| Labels, LED, tickers | DotGothic16 | Monospace-feel labels |
| Reading text | Zen Kaku Gothic New | Transcripts; weight 400 covers all CJK, 700 is Latin only |
| Baybayin | Noto Sans Tagalog | Decorative, U+1700–171F. Self-hosted subset is pending (see PR 5 notes) |

Fonts are self-hosted subsets. Nothing loads from Google Fonts at runtime.

## Motion budget

- Flash limit (WCAG 2.3.1): at most 3 cuts per second. Flips are queued at 3/sec. Static is level-matched to ±8% average brightness. No full-screen swap to saturated red.
- Animations run on a loop clocked to the broadcast, not on wall time per visit. Each channel's timeline is seeked to its clock-synced progress.
- Use `steps(n)` for the 12 fps "on twos" feel on characters and poses. Use smooth easing for tickers and drifts.
- Brightness changes are not used for emphasis. Emphasis is scale, position or a wipe.
- `prefers-reduced-motion`: every channel holds on its designed still frame (`stillAt`). No static burst, no loops, no spin.
- MOTION button and Space pause everything, including the canvas and CSS animations.

## Copy rules

- All copy lives in JSON (`chNN.json`, `schedule.json`), never in markup.
- Each channel has a text transcript taken from its JSON. Decorative art is `aria-hidden`.
- Baybayin is real Unicode, wrapped in `role="img"`, `lang="tl-Tglg"` and an English `aria-label`.
- Tagalog and Japanese spellings are reviewed by MK. Do not invent folklore details; flag uncertain copy.

## Channel signatures (summary)

Full table in `docs/PLAN.md`.

| CH | Signature | Loop |
| --- | --- | --- |
| 03 Emergency Alert | Kanji slam in with overshoot; magenta bars wipe; ticker scrolls; sign pulses by scale | 8 s |
| 01 Spirit Weather | Title drops in on `steps(3)`; fronts creep along the map | 12 s |
| 04 Hypnosis | Rings breathe 0.97–1.03; spiral turns slowly | 20 s |
| 06 Advice Line | Cards type on line by line; tracking band drifts | 14 s |
| 07 Shadow Play | Neck draws on, head turns; light flickers under 10% | 16 s |
| 09 Sky Watch | Rings shrink to centre; stars twinkle on canvas | 10 s |
| 00 Cursed Tape | Tracking bands drift; counter runs backward; no jump scares | 30 s |

## Components

- Every control is a real `<button>` or `<a>` with a visible focus ring (`:focus-visible`, `--green`, 3 px).
- Touch targets are at least 44 × 44 px.
- No live SVG filters on animated layers (iOS Safari). Scanlines, vignette and halftone are CSS gradients; grain is a baked PNG.
