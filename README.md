# 怪電波 Kaidenpa

A haunted CRT you channel-flip, at [tv.chibimuere.com](https://tv.chibimuere.com).

No seizure inducing flashing lights; I guarantee this is a11y & spoopy. 👻

It's on air from 00:00 to 04:44 on your device's clock (04:44 is the mirror hour) and goes off air the rest of the day. Visitors who arrive when Kaidenpa is off air can still watch a rerun from the tape rack. The visual and ambient inspiration of *Kaidenpa* comes from: The Ring, Durarara!!, Jigoku Shoujo, and DanDaDan.

**Status:** 🚧 Under construction. 🚧 The scaffold is in place; the broadcast clock, TV shell and channels are landing PR by PR.

## How it works

- `src/broadcastClock.js` decides what is on air. It reads local wall-clock fields, never elapsed time, so daylight saving can't shift the window.
- `src/channelController.js` decides how the screen changes: channel flips, static, pause and reduced motion.
- Each channel is a folder, `src/channels/chNN/`, with `index.js`, `chNN.json` and `chNN.css`. All copy lives in JSON, not markup.

| State    | Local time  |
| -------- | ----------- |
| On air   | 00:00–04:42 |
| Sign-off | 04:43       |
| Off air  | 04:44–23:59 |

Off air, the page offers the Haunted Tape, a rerun frozen at 04:20 (🫣). Share a rerun at any hour with `?rerun`, or pick a channel with `?rerun=04`.

## Stack

- Vite and plain ES modules, 
- no framework
- GSAP (core, SplitText, DrawSVGPlugin) for motion, 
- One 2D canvas for static
- Self-hosted font subsets
- No cookies, no analytics, 
- No audio in v1
- Hosted on GitHub Pages @ [https://tv.chibimuere.com](https://tv.chibimuere.com)

## Develop

Needs Node LTS.

```bash
npm ci
npm run dev
```

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                           |
| `npm run build`        | Production build to `dist/`                               |
| `npm test`             | Vitest unit tests                                         |
| `npm run test:a11y`    | Playwright + axe-core                                     |
| `npm run lint`         | ESLint, Prettier check, and textlint on the Japanese copy |

Japanese copy is linted by extracting every Japanese string from the JSON files and running textlint on the result. That catches typos and style slips but doesn't replace a native-speaker review.

## Accessibility

- At most 3 cuts per second, so holding an arrow key cannot strobe.
- The MOTION button and Space pause everything.
- `prefers-reduced-motion` gets designed still frames instead of loops and static.
- Keyboard works throughout: arrow keys, 0–9 and Space.
- Every channel has a heading and a text transcript.

## Docs

- [`docs/PLAN.md`](docs/PLAN.md): the technical plan and PR breakdown.
- [`docs/mocks/`](docs/mocks/): the design mocks.
- [`CLAUDE.md`](CLAUDE.md): working conventions for the coding assistant.

```bash

A Chibi Muere transmission.

```
