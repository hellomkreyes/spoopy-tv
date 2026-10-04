# 怪電波 Kaidenpa (tv.chibimuere.com)

A haunted CRT you channel-flip, on air only 00:00–04:44 on the visitor's device clock (04:44 is the mirror hour). Visual inspiration only; no copied characters, song or credit layouts. Full plan: `docs/PLAN.md`. Mocks: `docs/mocks/` (Main/Mobile UI, Off Air + Haunted Tape, Static, and every channel). Project: Kaidenpa (怪電波). Repo: `hellomkreyes/spoopy-tv` (repo name only; the project is still called Kaidenpa).

## How we work
- MK is the design eye and manager; you are the engineer. **Propose a short plan and wait for approval before big changes** (new modules, architecture, dependencies, anything touching more than ~5 files).
- One PR per step in the PR breakdown in `docs/PLAN.md`. One branch per PR (`pr-02-broadcast-clock`). Small commits. Don't start the next PR unprompted.
- Match the mocks. If you want to deviate for technical or accessibility reasons, say so and ask.
- Keep copy in JSON (`chNN.json`, `schedule.json`), never hard-coded in markup. Japanese copy gets a native-speaker review before launch, so don't invent folklore details.

## Stack
- Vite + plain ES modules. No framework. Node LTS, `npm ci` in CI.
- GSAP core + SplitText + DrawSVGPlugin. **Pin the exact version** (lockfile). Register plugins once in `src/motion.js`. Always create animations inside `gsap.context()` and `revert()` on exit.
- Fonts: Dela Gothic One, DotGothic16, Zen Kaku Gothic New. **Self-host subsets** (no Google Fonts requests at runtime). `await document.fonts.ready` before any SplitText.
- Hosting: GitHub Pages, CNAME `tv.chibimuere.com`. No custom headers, so CSP goes in a `<meta>` tag. No cookies, no analytics, no audio in v1.
- Tests: Playwright (clock + timezone control) + axe-core. Unit tests for `broadcastClock`.
- Japanese copy: textlint with `textlint-rule-preset-ja-technical-writing` in CI. textlint can't read JSON, so `scripts/extract-ja-copy.mjs` extracts every Japanese string from `chNN.json` and `schedule.json` into one text file (one string per line) that textlint lints. Turn off preset rules that don't suit short display titles in `.textlintrc.json`, with a comment saying why. It doesn't replace the native-speaker review.

## Architecture rules
- `src/broadcastClock.js` decides what is on air; `src/channelController.js` decides how the screen changes. Everything else feeds them or is driven by them.
- Clock uses **local wall-clock fields** (`getHours()/getMinutes()`), never elapsed ms, so DST can't shift the window. States: `on-air` 00:00–04:42, `sign-off` 04:43 (60 s), `off-air` 04:44–23:59. Take `now` as a parameter so tests can pass any date. Never schedule with a single long timeout; re-check on `visibilitychange`, `focus`, `pageshow`.
- Channel contract: `src/channels/chNN/{index.js, chNN.json, chNN.css}`. `index.js` exports `build(el, data)` returning `{ timeline, loopMs, stillAt }`. Channels sync to the clock with `timeline.progress(((Date.now() - midnight) % loopMs) / loopMs)`. CH03 is the reference implementation to copy.
- Channel schedule (local time): CH01 03:00 Spirit Weather Report · CH03 03:15 Emergency Alert (cold open before 03:00) · CH04 03:33 Hypnosis Test Pattern · CH06 03:45 The 3AM Advice Line · CH07 03:52 Shadow Play · CH09 04:00 Sky Watch · CH00 hidden (Konami) Cursed Tape · 04:43 sign-off = Luna Pie teaser card, then 放送終了 at 04:44.
- One 2D canvas, one rAF loop (`fx.js`): 160×120 static burst scaled with `image-rendering: pixelated`, 6 pre-generated noise frames, DPR capped at 2. Same canvas is reused for the CH09 starfield. Loop stops on hidden tab, global pause, and reduced motion.
- Scanlines, vignette and halftone are CSS gradients. Grain is a baked PNG. **No live SVG filters on animated layers** (iOS Safari perf). Chromatic offset is `text-shadow` on text only.
- Off-air screen has one real button, drawn as a VHS tape: "PLAY THE HAUNTED TAPE · 04:20 AM". It starts a rerun with the clock frozen at 04:20 (Sky Watch on air by default), a RERUN bug, and a tracking wobble on entry. While off air the TV guide becomes a tape rack: every listing, including the 04:43 Luna Pie sign-off, has its own ▶ button (`?rerun=04`, `?rerun=so`; plain `?rerun` = Sky Watch). The frozen clock only pins the guide and on-screen time; channel loops run from tape start. When the sign-off ends, the tape ejects to the off-air card. Definition card (怪電波) and guide stay visible off air. The Haunted Tape (rerun mode) is separate from the Cursed Tape (CH 00, Konami).
- Konami: keyboard ↑↑↓↓←→←→ B A; touch = swipes ↑↑↓↓←→←→ then two taps on the LED. Vertical swipes also flip channels, so count gestures separately from flips (flips still obey the 3/sec cap).
- Cursed Tape (CH 00): starts with 13:00 of tape, burns only while CH 00 is watched, never refills on its own. At zero it shows the spent-tape card with a real button, UNCURSE THE TAPE, which refills it to 13:00. State in `localStorage` (try/catch). See `docs/mocks/ch00-cursed-tape.png` and `ch00-tape-spent-uncurse.png`.
- No audio in v1. v2 audio uses the Web Audio API directly (no library): one `audio.js`, dynamically imported when SOUND is first pressed; create/resume the `AudioContext` only inside that click; sources → bus `GainNode`s → master gain (~-18 dB) → `DynamicsCompressorNode` → destination; synthesize the hum (60 Hz + harmonics), static (filtered noise buffer), blips (oscillator + envelope) and a drone (detuned saws + low-pass + LFO); subscribe to controller events, never call audio from channels; `suspend()` on hidden tab/power off; off by default, no autoplay, never rely on sound alone (WCAG 1.4.2). Licence options are in `docs/PLAN.md`, Audio (v2).

## Accessibility rules (non-negotiable, enforced in tests)
- WCAG 2.3.1: at most 3 cuts per second. The channel-flip queue is capped at 3/sec; holding an arrow key must never exceed it. Static frames are levelled to the same average brightness (±8%). No full-screen swap to saturated red.
- 2.2.2 / 2.3.3: MOTION button and Space pause everything (`gsap.globalTimeline.pause()`, canvas loop, CSS animations via `.is-paused`). `prefers-reduced-motion` = designed still frames at `stillAt`, no static burst, no loops, no spin.
- 2.1.1: arrow keys, 0–9 and Space work. Every control is a real `<button>` or `<a>`.
- 4.1.3: channel LED is `aria-live="polite"`, debounced 500 ms.
- 1.1.1: each channel is a `<section>` with a heading and a text transcript from its JSON. Noise, scanlines and decorative SVG are `aria-hidden`.
- 1.4.3: 4.5:1 body text, 3:1 for 24px+. Check with axe and the contrast script.
- Wrap every `localStorage` read/write in try/catch (cursed tape state). The app must work with storage blocked.

## Commands
- `npm run dev` / `npm run build`: Vite dev server / production build to `dist/`.
- `npm test`: Vitest unit tests (`src/**/*.test.js`).
- `npm run test:a11y`: Playwright + axe-core (`tests/`); builds and serves `vite preview` itself, so tests run with the CSP `<meta>` in force (it is injected at build time only, because the dev server's injected `<style>` tags would violate it). Tests pin the clock with `page.clock.install` and use `America/Toronto`.
- `npm run lint`: ESLint, then `lint:style` (Prettier check, `lint:ja` which extracts Japanese copy to `build/ja-copy.txt` and runs textlint, and `lint:fonts`). `npm run format` fixes Prettier issues.
- `npm run fonts`: regenerates the self-hosted font subsets in `src/fonts/` (picks `@fontsource` slices for the glyphs used in `src/**/*.json`). Run it and commit the result whenever copy gains a new character; `lint:fonts` warns in CI (advisory) if the output is stale or a glyph has no font; the browser falls back to a system font.
- CI (`.github/workflows/ci.yml`) is one job, `check`. Prettier, textlint and `lint:fonts` are advisory (a warning annotation, never a failure); ESLint, unit tests, build and the Playwright + axe suite block. Require only `check` in branch protection. `.github/workflows/deploy.yml` is independent: it builds and publishes `dist/` to GitHub Pages on push to `main` (`public/CNAME` = tv.chibimuere.com) and never waits on CI.
