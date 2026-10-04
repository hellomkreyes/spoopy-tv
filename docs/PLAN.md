# 怪電波 Kaidenpa · Technical Plan

Oct 1, 2026 · @M.K. Muere

## Overview

Kaidenpa is a single-page haunted CRT at tv.chibimuere.com. It broadcasts six channels between midnight and 04:44 on the visitor's own clock and goes off air the rest of the day. It ships as 14 small PRs: 7 owned by Claude Code (CC), 7 by Luna Pie.

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite, plain ES modules, no framework | Same bare-bones setup as Mercury Rx; the UI state is small |
| Motion | GSAP core + SplitText + DrawSVGPlugin | Timelines can be paused, scrubbed and synced to the clock |
| Effects | CSS first, SVG filters for still textures, one 2D canvas for static | CSS and SVG are cheap; canvas only where pixels change every frame |
| Copy | JSON per channel + schedule.json | Luna Pie missions edit data, not markup |
| Fonts | Dela Gothic One, DotGothic16, Zen Kaku Gothic New, Noto Sans Tagalog (Baybayin), self-hosted subsets | Japanese fonts are large; subsetting keeps only the glyphs we use |
| Tests | Playwright (clock + timezone control) + axe-core + textlint (Japanese copy) | Every on-air, off-air and reduced-motion state is tested |
| Hosting | GitHub Pages, CNAME tv.chibimuere.com, $0 | Same as rx.chibimuere.com |
| Audio (v1, opt-in) | Web Audio API, built into browsers, no library | Synthesized hum, static and blips cost a few KB and need no licences; opt-in only. Pre-1923 UCSB cylinder clips are self-hosted and credited. Details in Audio below |

Audio ships in v1 as an opt-in: off by default, behind a visible SOUND button with mute and pause, never autoplaying (see Audio below).

## Hybrid direction (Japanese and Filipino)

From 2026-10-04 Kaidenpa is a hybrid: most channels stay Japanese, CH 04 and CH 06 are Tagalog, and every channel gains a big decorative Baybayin word. The goal is to culturally reclaim Filipino cryptids and mystics, aswang above all, using the Wikipedia article on witchcraft in the Philippines and the Aswang Project as folklore sources.

| Channel | Version | Baybayin accent | Notes |
| --- | --- | --- | --- |
| CH 01 Spirit Weather | Japanese | bakunawa | Big outlined word behind the map |
| CH 03 Alert | Japanese | babala | Behind the title |
| CH 04 Hypnosis | Tagalog + English | titigan, kulam | HIPNOSIS 4; spiral kept; every Tagalog line has an English line |
| CH 06 Advice Line | Tagalog | kulam, albularyo, mangkukulam | PAYO NG 3AM; albularyo and mangkukulam hosts |
| CH 07 Shadow Play | Japanese | aswang | Behind the shadow play |
| CH 09 Sky Watch | Japanese | santelmo | Over the sea |
| CH 00 Cursed Tape | Japanese | sumpa (tape-spent screen only) | Cursed tape is the Japanese original; the uncurse screen carries the big Baybayin word |

Off air, the sign-off and the Haunted Tape are unchanged for now; the off-air title is an open question.

**Baybayin rules.** It is decorative only. It is real Unicode text (Tagalog block, U+1700–171F) set in Noto Sans Tagalog, wrapped in `role="img"`, `lang="tl-Tglg"` and an English `aria-label`, so screen readers announce the label and skip the glyphs. Nothing may be understood only through Baybayin. The font is self-hosted as a subset like the others, and its licence is confirmed in PR 3. The mock PNGs use a fallback font, so their Baybayin looks blocky; the live canvas shows the real glyphs. MK reviews every spelling in the copy sheet.

**Copy checks.** textlint stays in CI for the Japanese strings only. Tagalog lines are reviewed by MK in the copy sheet before launch; there is no automated Tagalog check.

## Broadcast timing and the midnight gate

The site reads the device's local clock and shows one of three states: **ON AIR** from 00:00 to 04:42, **SIGN-OFF** for the last 60 seconds before 04:44, and **OFF AIR** from 04:44 to 23:59. The gate is about the vibe, not security, since anyone can change their clock.

**The schedule is data.** `schedule.json` lists each channel's air time in local wall-clock strings, and the TV guide renders from the same file:

```json
{ "window": { "start": "00:00", "signOff": "04:43", "end": "04:44" },
  "rerun": { "clock": "04:20", "default": "09" },
  "listings": [
    { "ch": "01", "start": "03:00", "show": "spirit-weather" },
    { "ch": "03", "start": "03:15", "show": "emergency-alert" },
    { "ch": "04", "start": "03:33", "show": "hypnosis" },
    { "ch": "06", "start": "03:45", "show": "advice-line" },
    { "ch": "07", "start": "03:52", "show": "shadow-play" },
    { "ch": "09", "start": "04:00", "show": "sky-watch" },
    { "ch": "so", "start": "04:43", "show": "luna-pie-sign-off" } ] }
```

**How the clock drives things:**

1. `broadcastClock.state(now)` reads `getHours()` and `getMinutes()` in local time and returns `on-air`, `sign-off` or `off-air`. It uses wall-clock fields, never elapsed milliseconds, so daylight-saving jumps can't shift the window.
2. `currentListing(now)` returns the show that is live right now. The guide marks it ● ON AIR, and the TV tunes to it when you first arrive. Before 03:00 the TV opens on CH 03, the Emergency Alert, as a cold open. Visitors can flip to any channel at any time.
3. **Every channel runs in sync with the clock, like real TV.** Each show is a looping GSAP timeline of length `loopMs`. On tune-in we call `timeline.progress(((Date.now() - midnight) % loopMs) / loopMs)` and then play. Two people tuning in at 03:16 see the same frame, and flipping away and back lands you mid-show, not at the start.
4. `scheduleNextBoundary()` sets a single timeout for the next state change (00:00, 04:43 or 04:44), built with `new Date(y, m, d, h, min)` so it lands on local time. Background tabs throttle timers, so we also re-check on `visibilitychange`, `focus` and `pageshow`.
5. At 04:43 the sign-off plays even if someone is watching, and it's the Luna Pie slot: static clears into the Luna Pie "next transmission" card (the sigil, ☾, LUNA PIE — OPENING THEME), then 放送終了 ("end of broadcast"), a short burst of static, and the off-air screen at 04:44, the mirror hour. Only people who stay up that late see the teaser live; reruns include it too (see below).

**Off air (04:44–23:59)** shows a sign-off test card with a countdown to midnight in DotGothic16. The definition and TV guide stay visible, so the site still explains itself during the day.

**Reruns, for daytime visitors: the Haunted Tape.** Hiring managers will mostly visit during the day. The off-air screen has one real button, drawn as a VHS tape with a handwritten label: **▶ PLAY THE HAUNTED TAPE · 04:20 AM**. It starts a recorded broadcast with the clock frozen at 04:20, so Sky Watch (CH 09) is on air by default, with a "RERUN" bug in the corner and a VHS tracking wobble as the tape loads. While off air, the TV guide becomes a tape rack: every listing, including the 04:43 Luna Pie sign-off, gets its own ▶ button, so visitors can start on any channel (`?rerun=04`, `?rerun=so`). Plain `?rerun` starts on Sky Watch, so a link you share works at any hour. The frozen clock only pins the guide and the on-screen time to 04:20; each channel's loop runs from the moment the tape starts. When the sign-off finishes, the tape ejects to the off-air card. The Konami code still works inside the tape.

## Architecture

Two modules make all the decisions: `broadcastClock.js` decides what is on air, and `channelController.js` decides how the screen changes. Everything else feeds them or is driven by them.

**Who calls whom (text version of the diagram):** `main.js` boots the app and reads `broadcastClock`. `broadcastClock` (state, `currentListing`, `scheduleNextBoundary`, reads `schedule.json`) tells `channelController` what is on air. `channelController` owns the current channel, the flip queue (max 3 per second), the static burst via `fx.js` (the single rAF loop and canvas), and motion preferences via `motion.js` (GSAP registration, `matchMedia`, global pause). The controller loads each channel's `build(el, data)` from `src/channels/chNN/`. UI pieces (LED, guide, definition card, off-air screen, buttons) subscribe to the controller's small store and never call channels directly.

Every channel is a folder, `src/channels/chNN/`, holding `index.js`, `chNN.json` and `chNN.css`. `index.js` exports `build(el, data)`, which returns `{ timeline, loopMs, stillAt }`. `stillAt` is the progress point used as the designed still frame for reduced motion. CH 03 is the reference folder that Luna Pie copies.

## GSAP plan

Each channel gets one looping timeline, kept inside a `gsap.context()` so tuning away reverts it cleanly. Plugins: SplitText for the kinetic type, DrawSVGPlugin for line draws, both registered once in `motion.js`.

**Controller and transitions**

- **Channel change:** `exit` (40 ms hard cut) → static burst (280 ms) → `enter`, which seeks the new channel to its clock-synced progress and plays. No crossfades; anime cuts are hard.
- **Throttle:** flip requests are queued and run at most 3 per second, so holding an arrow key can never pass the flash threshold.
- **The "on twos" feel:** `ease: "steps(n)"` on character and pose tweens, for that 12 fps choppiness, while tickers and drifts stay smooth. We never throttle the whole page with `gsap.ticker.fps()`.
- **Fonts first:** `await document.fonts.ready` before any SplitText call, or the character boxes get measured in the fallback font.

**Motion preferences**

- `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)`: no static burst, no loops. Each channel is set with `timeline.progress(stillAt).pause()`, so you get a designed still frame, not a frozen mid-tween.
- **Global pause** (the MOTION button or Space) calls `gsap.globalTimeline.pause()`, stops the canvas loop and adds `.is-paused` to `<html>`, which sets `animation-play-state: paused` on any CSS animation.

| CH | Signature timeline | Loop | Notes |
| --- | --- | --- | --- |
| 01 Spirit Weather | Title chars drop in on `steps(3)`; fronts creep along the map path; ghost icon bobs; forecast cards flip in one at a time | 12 s | Ticker is a GSAP `x` tween so it pauses with everything else |
| 03 Emergency Alert | 警報 characters slam in with overshoot; magenta bars wipe across; ticker scrolls | 8 s | Reference channel; the warning-sign pulse is a scale change, not a brightness flash |
| 04 Hypnosis | Rings breathe 0.97 to 1.03 scale; spiral turns no faster than 1 turn per 10 s; colour bars stay still | 20 s | Big-area motion, so it gets the most conservative timing |
| 06 Advice Line | Caller and host cards type on line by line; VHS tracking band drifts down; title chars jitter 2 px on `steps(2)` | 14 s | Chromatic offset is a text-shadow tween |
| 07 Shadow Play | Neck draws on with DrawSVG, then the head turns; paper-screen light flickers in brightness by under 10% | 16 s | The neck path is drawn once and reversed for the loop |
| 09 Sky Watch | Grid rings shrink toward the centre one at a time; beam opacity wobbles; saucer bobs; credits slide in vertically | 10 s | Stars twinkle on the canvas layer |
| 00 Cursed Tape | Tracking bands drift; the eyes in the static fade in slowly across the loop; the TAPE LEFT counter runs backward; at zero the tape ejects to the spent-tape card on CH 00 | 30 s | Opened by the Konami code. Starts with 13:00 of tape and never refills on its own; the spent-tape card offers an UNCURSE THE TAPE button that refills it to 13:00. Remaining tape is saved in `localStorage` (wrapped in try/catch). No jump scares or flashes |
| Sign-off · Luna Pie | Static clears from the sigil outward; LUNA PIE letters fade in on `steps(4)`; card holds, then 放送終了 and static | 60 s, one-shot | Starts at 04:43 local time, and can be picked from the guide in reruns. Under reduced motion it's the still card, then a hard cut to off air |

## Canvas and SVG effects

There's only one live canvas on screen at a time. Everything else is CSS or SVG that is drawn once, or is moved by GSAP transforms.

| Effect | Technique | Cost control |
| --- | --- | --- |
| Static burst | One 2D canvas at 160×120, scaled up with `image-rendering: pixelated`. Six noise frames are generated once at load as `ImageData`, then cycled. | No per-frame random generation. Each frame is levelled to the same average brightness (±8%), so static flickers without flashing. |
| Sky Watch stars | The same canvas, reused: about 120 points that twinkle with a cosine on the clock | Runs only while CH 09 is tuned in |
| Scanlines, vignette, halftone | CSS gradients on an overlay | No cost per frame |
| Grain and paper texture | An SVG `feTurbulence` pass, rendered once into a PNG at build time and used as a background | Live SVG filters are slow on iOS Safari, so none run on animated layers |
| Wobbly lines (map fronts, neck) | SVG paths animated with DrawSVG or a `strokeDashoffset` tween | Small vector redraws |
| Chromatic offset, CRT glow | `text-shadow` and `filter: drop-shadow` on text only | Never on full-screen layers |

**Canvas loop rules**

- **One loop:** a single `requestAnimationFrame` loop in `fx.js`, started by the controller and stopped when the tab is hidden (`visibilitychange`), on global pause, or under reduced motion.
- **Retina:** the backing store is sized by `devicePixelRatio`, capped at 2.
- **Budget:** under 4 ms of script per frame on a mid-range phone, checked with the Performance panel at 4× CPU throttling in the perf PR.
- **Low Power Mode:** iOS caps animation at 30 fps there. Loop timing reads the clock, not frame counts, so speeds stay correct.

## Accessibility guardrails

Every PR has to pass these checks before Mars approves it.

| WCAG | Rule for Kaidenpa | How it's enforced |
| --- | --- | --- |
| 2.3.1 Three flashes | At most 3 cuts per second. Static frames are levelled to the same average brightness. No full-screen swap to saturated red. | Controller queue, plus a Playwright test that fires 10 flip requests and counts the cuts |
| 2.2.2 Pause, stop, hide | The MOTION button and Space pause every timeline, the canvas and CSS animations | Test: after pausing, timeline progress stays the same for 2 s |
| 2.3.3 Motion from interactions | Under reduced motion: designed still frames, no static, no spin | Playwright `reducedMotion: 'reduce'` run on every channel |
| 2.1.1 Keyboard | Arrow keys, 0–9 and Space work; every control is a real `<button>` or `<a>` | axe, plus a keyboard-only Playwright path |
| 4.1.3 Status messages | The LED announces "Channel 3: Emergency Alert" through `aria-live="polite"`, debounced by 500 ms so fast flipping doesn't flood screen readers | Test on the live region's text |
| 1.1.1 Text alternatives | Each channel is a `<section>` with a heading and a text transcript taken from its JSON; noise, scanlines and decorative SVGs are `aria-hidden` | axe |
| 1.4.3 Contrast | 4.5:1 for body text and 3:1 for 24 px and up, checked on every two-colour combination | axe, plus a token contrast script in CI |

When the site is off air, it still has to make sense: the test card says when the broadcast starts, in text a screen reader can read, and the rerun button is always reachable.

## PR breakdown

Fourteen PRs, in order. CC builds the foundations and the risky channels; Luna Pie copies patterns once CH 03 exists. Each Luna mission covers one PR and gets the CH 03 folder as its pattern file.

| # | PR | Owner | Depends on | Done when |
| --- | --- | --- | --- | --- |
| 1 | Scaffold (repo: spoopy-tv): Vite, ESLint, Prettier, Playwright + axe, textlint (Japanese preset), GitHub Pages workflow, CNAME tv.chibimuere.com, CI on `npm ci` | Luna (Moon) | — | Empty page deploys over HTTPS and CI runs textlint on the extracted Japanese copy |
| 2 | `broadcastClock.js`, `schedule.json`, off-air test card, countdown, Haunted Tape rerun at 04:20 via `?rerun` | CC | 1 | Clock tests pass for 23:59, 00:00, 04:42, 04:43, 04:44, a DST night and a timezone change |
| 3 | TV shell from the mocks: bezel, controls, LED, definition card, TV guide (with ▶ tape buttons when off air), mobile layout, self-hosted font subsets | CC | 1 | Matches the mocks at 390 and 1440 px; axe is clean |
| 4 | `channelController.js`, `motion.js`, `fx.js` static burst, flip queue, global pause, reduced motion | CC | 2, 3 | Flip, pause and reduced-motion tests pass on a placeholder channel |
| 5 | CH 03 Emergency Alert, the reference channel | CC | 4 | Loop, still frame, transcript and tests all in place |
| 6 | CH 01 Spirit Weather | Luna | 5 | Same checklist as CH 03 |
| 7 | CH 06 Advice Line (Tagalog) | Luna | 5 | Same checklist |
| 8 | CH 04 Hypnosis (Tagalog + English) | CC | 5 | Same checklist, plus a manual motion-comfort review |
| 9 | CH 07 Shadow Play | Luna | 5 | Same checklist; the neck draw also has a still frame |
| 10 | CH 09 Sky Watch + canvas starfield | CC | 5 | Same checklist; canvas stops when hidden |
| 11 | CH 00 Cursed Tape + `konami.js` (with a touch version) + the 04:43 Luna Pie sign-off card | Luna | 2, 5 | Konami code tunes to CH 00 on keyboard (arrows + B A) and touch (swipes + two LED taps); the tape starts at 13:00, burns only while CH 00 is watched, never refills on its own, and UNCURSE THE TAPE refills it; the counter survives a reload and a blocked `localStorage`; the sign-off plays at 04:43 in the clock tests |
| 12 | Audio (opt-in): SOUND button, `audio.js` Web Audio chain, synthesized hum, static and stingers, self-hosted pre-1923 UCSB cylinder clips, `credits.json` and a credits panel | CC | 4, 6–11 | Off by default and never autoplays; pauses with MOTION; every clip has a credits entry and a confirmed pre-1923 date; each clip ≤ 250 KB and loaded on tune |
| 13 | Test matrix: every channel × {motion, reduced} × {desktop, mobile} × {on air, off air, rerun}, plus screenshot baselines | Luna (Jupiter) | 6–12 | Suite is green in CI |
| 14 | Audit and launch: Lighthouse, axe, perf budget, OG image, project card on chibimuere.com | Luna (Mars) | 13 | Lighthouse a11y 100, perf ≥ 90 on mobile |

PRs 6, 7, 9 and 11 can run in parallel once PR 5 merges. Use the cheaper models for 12 and 13.

**Japanese copy checks in CI.** textlint with `textlint-rule-preset-ja-technical-writing` runs in CI from PR 1. textlint reads Markdown and plain text, not our channel JSON, so a small script (`scripts/extract-ja-copy.mjs`) pulls every Japanese string out of `chNN.json` and `schedule.json` into one text file, one string per line, and textlint lints that. The preset is written for technical prose, so `.textlintrc.json` turns off any rules that don't suit short display titles (for example the period rule) and notes why in a comment. It catches typos, mixed politeness levels and awkward patterns. It can't judge tone or folklore, so MK reviews the copy sheet before launch.

## Stack risks

The biggest risk isn't technical: most people who matter will visit during the day and see the site off air. Rerun mode exists for them.

| Risk | What happens | Mitigation |
| --- | --- | --- |
| Daytime visitors | A hiring manager sees a test card, not the show | Big ▶ PLAY THE HAUNTED TAPE button; the portfolio card links to `?rerun` |
| Daylight saving | In Toronto, spring-forward skips 02:00–03:00 and fall-back repeats 01:00–02:00, both inside the window | Gate on wall-clock fields, not elapsed time; Playwright runs both nights with `timezoneId: 'America/Toronto'` |
| Background-tab throttling | Chrome slows chained timers in hidden tabs to about once a minute, so the 04:43 sign-off can be missed | Re-check the state on `visibilitychange`, `focus` and `pageshow`; never rely on a single timeout |
| Wrong or changed device clock | Someone sees the show at noon | Accepted. It's a vibe gate, and a changed clock is a fun way in |
| Crawlers and link previews | Bots render the off-air screen | Static OG image and meta tags that don't depend on the clock |
| GSAP license | GSAP is owned by Webflow. All plugins have been free since 3.13, but the terms could change | Pin the version with a lockfile; re-read the license before launch |
| Japanese fonts | Full CJK fonts are several MB, and SplitText measures wrong if fonts load late | Subset to the glyphs used in the JSON copy at build time; CI fails if copy uses a missing glyph; `document.fonts.ready` before splitting |
| Third-party font requests | Google Fonts sends visitor IPs to Google, which breaks the "no cookies, no tracking" promise | Self-host the subsets |
| iOS Safari | Live SVG filters drop frames, Low Power Mode caps animation at 30 fps, in-app browsers vary | Bake textures to PNG, time loops from the clock, test Safari mobile in PR 13 |
| GitHub Pages limits | No custom headers (so no CSP header) and a 10-minute cache | CSP via a `<meta>` tag; Vite's hashed asset names; allow time for the HTTPS cert on the new subdomain |
| Konami vs arrow keys | ↑↑↓↓←→←→ also flips channels | Keep it as part of the joke: the arrows flip channels, then B A lands on CH 00. Touch: swipes ↑↑↓↓←→←→ then two taps on the LED. Vertical swipes also flip channels, so the controller counts gestures separately from flips |
| Cursed tape storage | `localStorage` is blocked in some private windows and wiped when people clear site data, so the curse resets | Every read and write is in try/catch; with no storage the tape starts full each visit. It stays on the device and is never sent anywhere |
| Timeline and SplitText leaks | Memory grows after many flips | `context.revert()` on exit; a test flips 50 times and checks the heap |
| Vanilla JS state sprawl | Ad-hoc globals once six channels share state | One small store in the controller (state plus events); rethink if it passes about 150 lines |
| Japanese copy and folklore | Awkward phrasing or careless use of folklore | textlint (ja-technical-writing preset) in CI for typos and style, MK's own review of the copy sheet before launch |
| Luna Pie cost | Missions balloon | One PR per mission, the existing spending cap, cheaper models for tests and audits |

## Audio (v1, opt-in)

Audio ships in v1 as an opt-in: a SOUND button, off by default, with no autoplay (browsers block it anyway, and WCAG 1.4.2 asks for an audio control). The choice is remembered in `localStorage` inside try/catch. The plan is one low ambient bed plus a short stinger per channel and the tuning static. We won't use commercial anime or J-pop music, including the song that inspired the look.

**How audio uses the Web Audio API** (no audio library):

- One `audio.js` module, loaded with a dynamic `import()` the first time someone presses SOUND, so v1 never touches audio.
- The `AudioContext` is created or resumed inside that button's click handler. Browsers, iOS Safari especially, refuse to start audio any other way, so the page never creates a context before a tap. A Playwright test checks this.
- Graph: sources go to a `GainNode` per bus (bed, fx, stingers), then one master `GainNode` capped around -18 dB, then a `DynamicsCompressorNode`, then the destination.
- Synthesized sources: the CRT hum is a 60 Hz sine plus harmonics (North American mains); static is a looping noise `AudioBuffer` through a `BiquadFilterNode`; a tuning blip is a short `OscillatorNode` with a gain envelope (`setTargetAtTime`); the drone is two detuned sawtooth oscillators through a low-pass filter with a slow LFO on the cutoff.
- Hooks: `channelController` emits events (`tune`, `staticStart`, `staticEnd`, `power`, `signOff`) and `audio.js` subscribes. Channels never call audio directly. The static sound matches the 280 ms visual burst and is level-matched, so there are no volume spikes.
- Safety: SOUND is off by default and remembered in try/catch; `AudioContext.suspend()` runs when the tab is hidden or the TV is powered off; fades use `linearRampToValueAtTime` so nothing clicks; no information is ever carried by sound alone. MOTION pause and reduced motion don't change audio; SOUND is its own control.
- If we add sampled files, they load with `fetch` and `decodeAudioData` into `AudioBuffer`s, kept short, mono and under about 200 KB each.
- iOS can mute Web Audio with the ring/silent switch, so PR 13 tests on a real iPhone.

| Source | Licence | Cost | Fit |
| --- | --- | --- | --- |
| Synthesized in the browser (Web Audio API) | Ours, no licence needed | Free, a few KB | CRT hum, static, tuning blips and a low drone. No files to host; Luna Pie can build it |
| [Kevin MacLeod, incompetech](https://incompetech.com/music/royalty-free/faq.html) | CC BY 4.0: credit required, website use allowed; a paid Standard License removes the credit | Free or paid | Large catalogue including dark ambient. Credit line goes in the footer |
| Freesound, CC0 filter | CC0 per file; check each file's licence | Free | Stingers, tape clicks, room tone. Terms not yet checked |
| Pixabay Music | Pixabay licence; check the terms per track | Free | Easy to browse. Confirm the terms allow use inside a website before picking |
| An original track | Ours | Time | Could double as the Luna Pie opening-theme sting |

My suggestion: synthesize the hum, static and blips (zero licensing risk), and pick one or two CC BY or CC0 ambient beds for the drone, with credits in the footer.

**Cylinder recordings.** Channel audio uses clips from the [UCSB Cylinder Audio Archive](https://cylinders.library.ucsb.edu/licensing.php). Per its licensing page, cylinders recorded before Dec 31, 1922 are public domain and free for any use; later cylinders' MP3s are CC BY-NC 2.5 (© The Regents of the University of California, credit required) and WAVs are paid licences. Rules:

- Pre-1923 cylinders only, and each clip's recording or issue date is confirmed on its archive page before it ships.
- Use the free MP3 downloads, trimmed to short mono loops (about 15–30 s, ≤ 250 KB). Self-host them in `public/audio/`; never hotlink the archive.
- Credit every track anyway: a `src/audio/credits.json` entry per clip (title, performer, label and number, year, archive URL, licence), rendered in a credits/about panel. Credit line: "University of California, Santa Barbara Library, UCSB Cylinder Audio Archive."
- Screen every clip for content: many vaudeville and minstrel-era cylinders carry racist lyrics or caricature, and those are excluded.
- Processing on top is fine: bandpass "radio" or telephone filter, slowed playback, warble (LFO on `playbackRate`/`detune`), crackle and static, reversed buffers for CH 00.
- The existing audio rules still hold: off by default, visible mute and pause, never autoplay (WCAG 1.4.2).

## Decisions and open questions

- [x] Window: the broadcast ends at 04:44 to match the mirror warning. Sign-off runs 04:43–04:44.
- [x] Reruns: the Haunted Tape starts at 04:20, and visitors can pick any channel from the guide.
- [x] Touch Konami: swipes ↑↑↓↓←→←→, then two taps on the LED.
- [x] Reruns include the Luna Pie sign-off, as a pickable 04:43 row in the guide.
- [x] Repo: `hellomkreyes/spoopy-tv` (project name stays Kaidenpa).
- [x] Audio: v1, opt-in, built with the Web Audio API: synthesized hum, static and stingers plus self-hosted pre-1923 UCSB cylinder clips, each credited. Details in Audio above.
- [x] Cursed Tape: starts with 13 minutes of tape and never refills on its own. When it runs out, an UNCURSE THE TAPE button refills it to 13:00.
- [x] Copy review: MK reviews the hybrid copy sheet herself (Tagalog lines, Japanese readings, Baybayin spellings). A native Japanese check stays optional.
