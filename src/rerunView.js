/**
 * The Haunted Tape view: RERUN bug, frozen 04:20 clock, EJECT button and the rack.
 *
 * Functions
 *   renderRerun(stage, { ch, onPlay, onEject })  draws into `stage`; returns a teardown function
 *
 * Gotcha: the sign-off tape ('so') ejects itself after 60 s; other tapes run until ejected.
 * TODO (PR 4): replace the placeholder text with real channel playback.
 */
import { el } from './dom.js';
import { fill, to12h } from './format.js';
import copy from './offAir.json';
import { renderRack } from './rack.js';
import { listings, rerunClock } from './rerun.js';

const SIGN_OFF_MS = 60_000;

/** Returns a teardown function. */
export function renderRerun(stage, { ch, onPlay, onEject }) {
  const listing = listings.find((l) => l.ch === ch);
  const isSignOff = ch === 'so';
  const heading = `${isSignOff ? copy.rerun.signOffChannel : fill(copy.rerun.channel, { ch })} · ${listing.title}`;

  const screen = el(
    'section',
    { class: 'screen rerun is-tuning', 'aria-labelledby': 'rerun-title' },
    el(
      'div',
      { class: 'rerun-top' },
      el('span', { class: 'rerun-bug' }, `● ${copy.rerun.bug}`),
      el('time', { class: 'rerun-clock' }, to12h(rerunClock)),
    ),
    el(
      'h2',
      {
        id: 'rerun-title',
        class: 'screen-title',
        tabindex: '-1',
        'data-focus': '',
      },
      heading,
    ),
    el('p', { class: 'screen-sub' }, copy.rerun.placeholder),
    el(
      'button',
      { type: 'button', class: 'eject', onclick: onEject },
      copy.rerun.eject,
    ),
  );

  stage.append(
    el(
      'div',
      { class: 'tv-grid' },
      screen,
      renderRack({ playingCh: ch, onPlay }),
    ),
  );

  // The sign-off is a one-shot: when it ends, the tape ejects to the off-air card.
  const timer = isSignOff ? setTimeout(onEject, SIGN_OFF_MS) : null;
  return () => clearTimeout(timer);
}
