# Mocks

PNG renders of the Kaidenpa design mocks (made in Claude). Source of truth for look and layout.

- `off-air-haunted-tape.png`: off-air screen with the Haunted Tape button and tape-rack guide (reruns)
- `site-ui-desktop.png` / `site-ui-mobile.png`: TV shell, controls, LED, definition card, TV guide
- `static-burst.png`: between-channels static frame
- `ch01-spirit-weather.png`, `ch03-emergency-alert.png`, `ch04-hypnosis.png`, `ch06-advice-line.png`, `ch07-shadow-play.png`, `ch09-sky-watch.png`
- `signoff-0443-luna-pie.png`: 04:43 sign-off teaser (end of broadcast 04:44)
- `ch00-cursed-tape.png`: hidden Konami channel
- `ch00-tape-spent-uncurse.png`: CH 00 once the tape runs out, with the UNCURSE THE TAPE button

Hybrid versions (2026-10-04): CH 04 and CH 06 use the Tagalog boards; the others keep their Japanese look with a big decorative Baybayin word added.

- `ch04-hypnosis-tagalog.png`, `ch06-advice-line-tagalog.png`: use these instead of the Japanese-era CH 04 and CH 06 above
- `ch01-spirit-weather-hybrid.png`, `ch03-emergency-alert-hybrid.png`, `ch07-shadow-play-hybrid.png`, `ch09-sky-watch-hybrid.png`: use these instead of the Japanese-only versions above

The Baybayin in these PNGs uses a fallback bitmap font, so it looks blocky; the live canvas shows the real glyphs.

CH 00: `ch00-cursed-tape.png` (Japanese original) is the final cursed tape; `ch00-tape-spent-uncurse.png` is the final uncurse screen, now with the big Baybayin sumpa.

Live canvas: https://claude.ai/artifact/Br7aw99VHAjeM2d4NxMMoy

Note: these PNGs were rendered without the web fonts (fallback fonts for Dela Gothic One, DotGothic16 and Zen Kaku Gothic New), so use them for layout, color and composition, not exact typography. The live canvas above has the real fonts.
