# Kaidenpa PR Backlog

**Status:** PR 1–4 merged to main. PR 04a-docs-hybrid and PR 04b-controller-hooks in review.

**Next:** PR 5 (CH 03 Emergency Alert, reference channel) is the gate. PRs 6, 7, 9, 11 can run in parallel once PR 5 lands.

---

## Remaining PRs (5–14)

| # | PR | Owner | Depends on | Scope |
|---|----|----|-----------|-------|
| **5** | CH 03 Emergency Alert (reference) | CC | 4 | Loop + still + transcript (8 s loop, 警報 chars slam in, magenta bars wipe, ticker scrolls). All channels copy from this folder. |
| **6** | CH 01 Spirit Weather | Luna | 5 | Same pattern as CH 03: loop, still, transcript. Title drop-in, map fronts, ghost bob, forecast cards (12 s loop). |
| **7** | CH 06 Advice Line (Tagalog) | Luna | 5 | Tagalog + English lines, cards type, VHS tracking, chromatic jitter (14 s loop). Baybayin: kulam, albularyo, mangkukulam. |
| **8** | CH 04 Hypnosis (Tagalog + English) | CC | 5 | Every Tagalog line gets English underneath, rings breathe, spiral turns slow, colour bars still (20 s loop). Needs motion-comfort review. Baybayin: titigan, kulam. |
| **9** | CH 07 Shadow Play | Luna | 5 | Neck draws with DrawSVG, head turns, light flickers <10%. Still frame for the neck. (16 s loop). Baybayin: aswang. |
| **10** | CH 09 Sky Watch + canvas starfield | CC | 5 | Grid rings shrink, beam wobbles, saucer bobs, credits slide. Canvas reused for ~120 twinkling stars; stops when hidden (10 s loop). Baybayin: santelmo. |
| **11** | CH 00 Cursed Tape + Konami + sign-off | Luna | 2, 5 | Tape starts at 13:00, burns only on CH 00, never refills. At zero: spent-tape card + UNCURSE button. Konami: ↑↑↓↓←→←→ B A (keyboard) or swipes + LED taps (touch). Sign-off at 04:43: static clears, Luna Pie card, 放送終了. (30 s loop on tape, 60 s sign-off). Baybayin: sumpa (on spend screen only). |
| **12** | Audio (opt-in) | CC | 4, 6–11 | SOUND button off by default; Web Audio API; synth hum (60 Hz), static (filtered noise), stingers (envelope), drone (detuned saws + LFO); self-hosted pre-1923 UCSB cylinder clips; credits panel; subscribes to controller events (tune, power, pause, resume, etc.). No autoplay. Playwright test: no audio until SOUND pressed. |
| **13** | Test matrix + screenshots | Luna | 6–12 | Every channel × {motion, reduced motion} × {mobile, desktop} × {on-air, off-air, rerun}. Baseline comparisons. Green in CI. |
| **14** | Audit & launch | Luna | 13 | Lighthouse (a11y 100, perf ≥ 90 mobile), axe, perf budget, OG image, project card on chibimuere.com. |

---

## Before Wednesday

- [ ] **PR 04b-controller-hooks** → merge when CI passes. Adds events for audio subscription (tune, power, pause, resume, staticStart, staticEnd, signOff).
- [ ] **PR 5 plan** (CH 03, reference): Baybayin rules in place, fonts.mjs ready to subset Noto Sans Tagalog, channel pattern clear.

---

## Parallelizable work

Once PR 5 merges:
- **Luna:** PR 6 (CH 01), PR 7 (CH 06 Tagalog), PR 9 (CH 07), PR 11 (CH 00 + sign-off + Konami) can run in parallel.
- **CC:** PR 8 (CH 04, Tagalog + motion review) and PR 10 (CH 09 + canvas) can run in parallel after PR 5.

Audio (PR 12) waits for all channels to land, then CC builds it.
Tests (PR 13) and audit (PR 14) come last.

---

## Key notes for Wednesday

- CH 03 is the pattern; all channels copy its folder structure and test checklist.
- Baybayin: real Unicode (U+1700–171F) in Noto Sans Tagalog, `role="img"` + `aria-label`, self-hosted subset.
- Hybrid copy (Tagalog + Japanese) reviewed by MK before each PR lands.
- Cylinder clips: pre-1923 date confirmed per clip, ≤250 KB, self-hosted, credited in `src/audio/credits.json`.
- No audio until SOUND is pressed; all audio pauses with MOTION; never autoplay.
- Tests: Playwright runs every state (on-air, off-air, rerun, reduced motion) at 390px and 1440px. CI is green gate.
