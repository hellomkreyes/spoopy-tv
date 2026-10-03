/**
 * rack: the tape rack, the TV guide while off air or in a rerun.
 *
 * Functions
 *   renderRack({ playingCh, onPlay })  returns a <section> with one real <button> per listing
 *
 * Use
 *   stage.append(renderRack({ playingCh: '09', onPlay: (ch) => ... }))
 *   Leave playingCh unset to badge the default tape STARTS HERE; set it to badge
 *   that row PLAYING and mark it aria-current.
 *
 * Gotchas
 *   - Rows are built from schedule.json and copy from offAir.json; edit those, not this file.
 *   - 'so' (the 04:43 Luna Pie sign-off) shows SIGN-OFF in the CH column.
 *   - TODO (PR 3): becomes the full TV guide with an ON AIR marker when a channel is live.
 */
import { el } from './dom.js';
import { fill, to12h } from './format.js';
import copy from './offAir.json';
import { listings, rerunClock, rerunDefault } from './rerun.js';

export function renderRack({ playingCh, onPlay }) {
  const text = copy.rack;
  const items = listings.map((l) => {
    const isSignOff = l.ch === 'so';
    const isPlaying = l.ch === playingCh;
    const badge = isPlaying
      ? text.playing
      : !playingCh && l.ch === rerunDefault
        ? text.startsHere
        : null;
    return el(
      'li',
      { class: 'rack-row' },
      el(
        'button',
        {
          type: 'button',
          class: 'rack-item',
          'data-ch': l.ch,
          'aria-current': isPlaying ? 'true' : null,
          onclick: () => onPlay(l.ch),
        },
        el('span', { class: 'sr-only' }, text.play),
        el('span', { class: 'rack-play', 'aria-hidden': 'true' }, '▶'),
        el('time', { class: 'rack-time' }, l.start),
        el(
          'span',
          { class: 'rack-ch' },
          isSignOff ? text.signOffLabel : `CH ${l.ch}`,
        ),
        el(
          'span',
          { class: 'rack-title' },
          l.title,
          badge ? el('span', { class: 'rack-badge' }, ` · ${badge}`) : null,
        ),
      ),
    );
  });

  return el(
    'section',
    { class: 'rack', 'aria-labelledby': 'rack-title' },
    el('h2', { id: 'rack-title', class: 'rack-heading' }, text.title),
    el(
      'p',
      { class: 'rack-intro' },
      fill(text.intro, { time: to12h(rerunClock) }),
    ),
    el('ol', { class: 'rack-list' }, items),
  );
}
